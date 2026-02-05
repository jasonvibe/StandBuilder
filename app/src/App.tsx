import { useState, useEffect } from 'react';
import Home from './pages/Home';
import GenerateConfig, { type GenerationConfig as ConfigType } from './pages/GenerateConfig';
import Result from './pages/Result';
import type { SystemMetadata } from '@/types';

function App() {
  const [view, setView] = useState<'home' | 'result'>('home');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState<ConfigType | null>(null);
  const [allSystems, setAllSystems] = useState<SystemMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load standards_master.json
    fetch('/standards_master.json')
      .then(res => res.json())
      .then(data => {
        const masterSystem: SystemMetadata = {
          id: 'MASTER_STD',
          client: 'Standard Library',
          context: 'Global',
          systemName: '企业标准库',
          date: '2025-02-05',
          filename: 'standards_master.json',
          itemCount: Array.isArray(data) ? data.length : 0,
          tags: ['Standard', 'Master'],
          // Add content property to enable merging
          // Note: In a real app with huge data, we might not want to keep everything in memory
          // but for this scale (client-side tool), it's fine.
          content: Array.isArray(data) ? data : []
        } as any;

        // Load user-uploaded systems from local storage
        const userSystems = JSON.parse(localStorage.getItem('userSystems') || '[]');
        // Merge both data sources
        const mergedSystems = [masterSystem, ...userSystems];
        setAllSystems(mergedSystems);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load DB", err);
        // Even if db.json fails, load user systems from local storage
        const userSystems = JSON.parse(localStorage.getItem('userSystems') || '[]');
        setAllSystems(userSystems);
        setLoading(false);
      });
  }, []);

  const handleGenerateClick = () => {
    setIsConfigOpen(true);
  };

  const handleConfirmConfig = (cfg: ConfigType) => {
    setConfig(cfg);
    setIsConfigOpen(false);
    setView('result');
  };

  const handleBack = () => {
    setView('home');
    setConfig(null);
  };

  return (
    <>
      {view === 'home' && (
        <Home
          onGenerate={handleGenerateClick}
          systems={allSystems}
          loading={loading}
        />
      )}

      {view === 'result' && config && (
        <Result
          config={config}
          allSystems={allSystems}
          onBack={handleBack}
        />
      )}

      <GenerateConfig
        open={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onConfirm={handleConfirmConfig}
        systems={allSystems}
      />
    </>
  );
}

export default App;
