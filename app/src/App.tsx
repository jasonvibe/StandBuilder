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
    fetch('/db.json')
      .then(res => res.json())
      .then(data => {
        setAllSystems(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load DB", err);
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
