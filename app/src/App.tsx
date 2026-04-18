import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { TopNav } from './features/shared/TopNav';
import { TodayPage } from './features/today/TodayPage';
import { WeekPage } from './features/week/WeekPage';
import { AggregatePage } from './features/aggregate/AggregatePage';
import { WebPage } from './features/web/WebPage';
import { WebReport } from './features/web/WebReport';

export default function App() {
  const location = useLocation();
  const isReport = location.pathname === '/report';

  return (
    <div className="min-h-screen bg-bg text-ink">
      {!isReport && <TopNav />}
      <Routes>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/week" element={<WeekPage />} />
        <Route path="/aggregate" element={<AggregatePage />} />
        <Route path="/web" element={<WebPage />} />
        <Route path="/report" element={<WebReport />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
    </div>
  );
}
