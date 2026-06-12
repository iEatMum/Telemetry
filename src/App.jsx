import { useState } from 'react'
import TabBar from './components/TabBar.jsx'
import Today from './screens/Today.jsx'
import Streak from './screens/Streak.jsx'
import Sprint from './screens/Sprint.jsx'
import Money from './screens/Money.jsx'
import Train from './screens/Train.jsx'
import UrgeProtocol from './components/UrgeProtocol.jsx'
import SettingsSheet from './components/SettingsSheet.jsx'
import WeeklyReview from './components/WeeklyReview.jsx'

export default function App() {
  const [tab, setTab] = useState('today')
  const [urgeOpen, setUrgeOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  function openReview() {
    setSettingsOpen(false)
    setReviewOpen(true)
  }

  return (
    <div className="min-h-full bg-bg text-ink">
      <div className="relative mx-auto flex min-h-full max-w-app flex-col">
        <main className="flex-1 px-4 pb-28 pt-safe">
          {tab === 'today' && (
            <Today onOpenSettings={() => setSettingsOpen(true)} onOpenReview={openReview} />
          )}
          {tab === 'streak' && <Streak onOpenUrge={() => setUrgeOpen(true)} />}
          {tab === 'sprint' && <Sprint />}
          {tab === 'money' && <Money />}
          {tab === 'train' && <Train />}
        </main>

        <TabBar active={tab} onChange={setTab} />
      </div>

      {urgeOpen && <UrgeProtocol onClose={() => setUrgeOpen(false)} />}
      {settingsOpen && (
        <SettingsSheet onClose={() => setSettingsOpen(false)} onOpenReview={openReview} />
      )}
      {reviewOpen && <WeeklyReview onClose={() => setReviewOpen(false)} />}
    </div>
  )
}
