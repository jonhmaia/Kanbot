import { Route, Routes } from 'react-router-dom';
import TopNav from './components/layout/TopNav';
import TasksLayout, {
  RedirectLegacyMaster,
  RedirectLegacyProject,
  RedirectToTasks,
} from './components/layout/TasksLayout';
import { Toast } from './components/ui/Primitives';
import LoginPage from './pages/LoginPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectBoardPage from './pages/ProjectBoardPage';
import MasterBoardPage from './pages/MasterBoardPage';
import TeamPage from './pages/TeamPage';
import InsightsPage from './pages/InsightsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ChatDock from './components/ai/ChatDock';
import FocusStatusBar from './components/focus/FocusStatusBar';
import { ChatProvider } from './context/ChatContext';
import { useApp } from './context/AppContext';

export default function App() {
  const { error, toast, session, loadBootstrap, currentUser } = useApp();

  if (session === undefined && !currentUser) {
    return (
      <div className="min-h-screen">
        <div className="px-7 pt-24">
          <div className="h-[420px] animate-pulseSoft rounded-4xl bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  if (session === null) {
    return (
      <>
        <LoginPage onReady={loadBootstrap} />
        <Toast toast={toast} />
      </>
    );
  }

  if (error && !currentUser) {
    return (
      <div className="grid min-h-screen place-items-center p-8 text-center">
        <div className="max-w-sm">
          <p className="font-display text-[20px] text-chalk">Nao consegui falar com o Supabase</p>
          <p className="mt-2 text-[13px] leading-relaxed text-smoke">{error}</p>
          <p className="mt-4 text-[12.5px] text-smoke">
            Confira <code className="rounded bg-white/10 px-1.5 py-0.5">web/.env.local</code> e se o schema
            foi aplicado no projeto Kanbam.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ChatProvider>
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-[1560px]">
          <Routes>
            <Route path="/" element={<RedirectToTasks tab="reports" />} />
            <Route path="/tasks" element={<TasksLayout />}>
              <Route index element={<RedirectToTasks tab="reports" />} />
              <Route path="master" element={<MasterBoardPage />} />
              <Route path="master/team" element={<TeamPage />} />
              <Route path="master/insights" element={<InsightsPage />} />
              <Route path="master/reports" element={<ReportsPage />} />
              <Route path=":projectId" element={<ProjectBoardPage />} />
              <Route path=":projectId/team" element={<TeamPage />} />
              <Route path=":projectId/insights" element={<InsightsPage />} />
              <Route path=":projectId/reports" element={<ReportsPage />} />
            </Route>
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<RedirectLegacyProject />} />
            <Route path="/master" element={<RedirectLegacyMaster />} />
            <Route path="/team" element={<RedirectToTasks tab="team" />} />
            <Route path="/insights" element={<RedirectToTasks tab="insights" />} />
            <Route path="/reports" element={<RedirectToTasks tab="reports" />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<RedirectToTasks tab="reports" />} />
          </Routes>
        </main>
        <ChatDock />
        <FocusStatusBar />
        <Toast toast={toast} />
      </div>
    </ChatProvider>
  );
}
