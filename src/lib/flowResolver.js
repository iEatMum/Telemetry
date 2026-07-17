// flowResolver.js — the onboarding decision-graph runtime.
//
// The cousin of uiSchema.js/registry.js, for a SURVEY FLOW instead of a deck.
// The deck SDUI renders a flat tabs→blocks layout; onboarding is a directed
// graph of question nodes with declarative branching. Same security posture:
//   • the payload (onboardingFlow.json) is DATA, never code — branches are
//     rule OBJECTS, evaluated here against an allow-list of operators, so a
//     tampered flow can never execute logic;
//   • normalizeFlow() is defensive like normalizeLayout(): it drops junk nodes,
//     guarantees entryId resolves, and rewrites any dangling `goto` to the next
//     linear node so a bad edge degrades to linear order, never a dead end;
//   • unknown node `type` is the renderer's problem (safe skip), not ours.
//
// Pure module — no React, no IO. Everything takes plain data and returns plain
// data, so the whole graph is unit-testable without mounting a component.

const MAX_NODES = 64

// The operator allow-list. A branch's `when.op` can only ever be one of these;
// anything else evaluates false (fail-closed → fall through to default).
const OPS = {
  eq: (a, b) => a === b,
  ne: (a, b) => a !== b,
  lte: (a, b) => typeof a === 'number' && a <= b,
  gte: (a, b) => typeof a === 'number' && a >= b,
  lt: (a, b) => typeof a === 'number' && a < b,
  gt: (a, b) => typeof a === 'number' && a > b,
  in: (a, b) => Array.isArray(b) && b.includes(a),
  truthy: (a) => !!a,
  falsy: (a) => !a,
  isInt: (a) => Number.isInteger(a),
}

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v)

/** Read a dotted path ('modules.recovery') off the answers slice; undefined if absent. */
export function read(obj, path) {
  if (!path || typeof path !== 'string') return undefined
  return path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj)
}

function evalWhen(when, value) {
  if (!isObj(when) || typeof when.op !== 'string') return false
  const op = OPS[when.op]
  return op ? !!op(value, when.value) : false
}

/**
 * Evaluate a node's `validate` rule against the answers slice → boolean gate for
 * NEXT. Supports { var, op, value }, { all: [...] }, { any: [...] }. A node with
 * no `validate` is always advanceable (optional steps like mission/protocols).
 */
export function evalValidate(validate, answers) {
  if (!isObj(validate)) return true
  if (Array.isArray(validate.all)) return validate.all.every((r) => evalValidate(r, answers))
  if (Array.isArray(validate.any)) return validate.any.some((r) => evalValidate(r, answers))
  if (typeof validate.var === 'string') return evalWhen({ op: validate.op, value: validate.value }, read(answers, validate.var))
  return true
}

/**
 * Resolve the transition out of a node given the live answers slice. Returns
 * { goto, set } — goto is the next node id (or null at a terminal), set is an
 * optional patch to merge into the flow's runtime state (e.g. anchorRequired).
 * The first branch whose `when` (and optional cross-slice `andState`) both hold
 * wins; otherwise the default. A branch with no `read` reads the node's own
 * next.read, so a branch can gate on the value just written.
 */
export function resolveNext(node, answers) {
  const nx = node && node.next
  if (!isObj(nx) || node.terminal) return { goto: null, set: null }
  const primaryVal = read(answers, nx.read)
  for (const br of Array.isArray(nx.branches) ? nx.branches : []) {
    if (!isObj(br) || typeof br.goto !== 'string') continue
    const primary = evalWhen(br.when, br.when && 'read' in br.when ? read(answers, br.when.read) : primaryVal)
    const gate = isObj(br.andState) ? !!OPS[br.andState.op]?.(read(answers, br.andState.read), br.andState.value) : true
    if (primary && gate) return { goto: br.goto, set: isObj(br.set) ? br.set : null }
  }
  return { goto: typeof nx.default === 'string' ? nx.default : null, set: isObj(nx.defaultSet) ? nx.defaultSet : null }
}

/**
 * Turn a raw flow payload into a safe, resolvable graph. Drops non-object nodes
 * and nodes with no string id/type; dedupes ids; guarantees entryId points at a
 * real node; and rewrites every `goto`/`default` that targets a missing node to
 * the NEXT node in declaration order (dangling edge → linear fall-through).
 */
export function normalizeFlow(raw) {
  const src = isObj(raw) ? raw : {}
  const seen = new Set()
  const nodes = (Array.isArray(src.nodes) ? src.nodes : [])
    .slice(0, MAX_NODES)
    .filter((n) => isObj(n) && typeof n.id === 'string' && n.id && typeof n.type === 'string' && n.type)
    .filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true)))

  const ids = new Set(nodes.map((n) => n.id))
  const fixTarget = (target, index) => {
    if (typeof target === 'string' && ids.has(target)) return target
    return nodes[index + 1] ? nodes[index + 1].id : null // dangling → next linear, or end
  }

  const cleaned = nodes.map((n, i) => {
    if (!isObj(n.next) || n.terminal) return n
    const branches = (Array.isArray(n.next.branches) ? n.next.branches : [])
      .filter((b) => isObj(b) && isObj(b.when))
      .map((b) => ({ ...b, goto: fixTarget(b.goto, i) }))
    return { ...n, next: { ...n.next, branches, default: fixTarget(n.next.default, i) } }
  })

  const entryId = typeof src.entryId === 'string' && ids.has(src.entryId) ? src.entryId : cleaned[0]?.id || null
  return {
    schemaVersion: Number.isInteger(src.schemaVersion) ? src.schemaVersion : 1,
    entryId,
    nodes: cleaned,
  }
}

/** The node with a given id, or null. */
export function getNode(flow, id) {
  return (flow && flow.nodes ? flow.nodes.find((n) => n.id === id) : null) || null
}

/**
 * Longest reachable path from entry (node count), for the progress indicator —
 * the graph is variable-length, so ticks are drawn against the deepest branch.
 * Cycle-guarded (a node already on the current stack counts as a leaf).
 */
export function longestPath(flow) {
  return longestPathFrom(flow, flow && flow.entryId)
}

/**
 * Longest reachable path from a GIVEN node (that node included, terminal
 * excluded). This is what keeps the step counter honest mid-flow: the total
 * shown is `steps walked + longestPathFrom(currentId)`, so a branch that
 * resolves short SHRINKS the denominator instead of leaving the count
 * stranded at "13/15" on the final page.
 */
export function longestPathFrom(flow, id) {
  const memo = new Map()
  const walk = (nodeId, stack) => {
    if (!nodeId || stack.has(nodeId)) return 0
    if (memo.has(nodeId)) return memo.get(nodeId)
    const node = getNode(flow, nodeId)
    if (!node) return 0
    const nextStack = new Set(stack).add(nodeId)
    const targets = node.terminal || !isObj(node.next)
      ? []
      : [...(node.next.branches || []).map((b) => b.goto), node.next.default].filter(Boolean)
    const deepest = targets.reduce((mx, t) => Math.max(mx, walk(t, nextStack)), 0)
    const total = 1 + deepest
    memo.set(nodeId, total)
    return total
  }
  // The terminal 'initialize' node is a commit action, not a question — don't
  // count it toward the visible step total.
  const raw = walk(id, new Set())
  return Math.max(1, raw - 1)
}
