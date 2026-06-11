import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// Resolve tailwind's config from THIS file's folder, not the process cwd.
// The dev server is launched from a parent directory, and without this Tailwind
// would look for the config in the wrong place, find nothing, and emit no styles.
const here = dirname(fileURLToPath(import.meta.url))

export default {
  plugins: [tailwindcss(resolve(here, 'tailwind.config.js')), autoprefixer],
}
