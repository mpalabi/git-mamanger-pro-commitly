import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { EnhancedProjectDetail } from './components/EnhancedProjectDetail';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/project/:id" element={<EnhancedProjectDetail />} />
        <Route path="/project/:id/tasks" element={<EnhancedProjectDetail />} />
        <Route path="/project/:id/commits" element={<EnhancedProjectDetail />} />
        <Route path="/project/:id/diffs" element={<EnhancedProjectDetail />} />
        <Route path="/project/:id/metrics" element={<EnhancedProjectDetail />} />
        <Route path="/project/:id/settings" element={<EnhancedProjectDetail />} />
      </Routes>
    </Layout>
  );
}

export default App;