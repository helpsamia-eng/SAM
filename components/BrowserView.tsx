import React, { useState, useRef, useEffect, useCallback } from 'react';
import { performWebSearch } from '../services/geminiService';
import { ArrowLeftIcon, ArrowRightIcon, ArrowPathIcon, XMarkIcon, MagnifyingGlassIcon, SparklesIcon, GlobeAltIcon } from './icons';

type SearchResult = { title: string; uri: string };
type ViewState = 'homepage' | 'results' | 'page' | 'loading' | 'error';

interface BrowserViewProps {
    onClose: () => void;
}

const SamLogo = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M30 20 L70 20 L70 50 L30 50 L30 80 L70 80" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
        <path d="M10 60 L50 10 L90 60 M25 45 L75 45" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
        <path d="M50 10 L50 90 M30 30 L50 50 L70 30" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
    </svg>
);

const BrowserView: React.FC<BrowserViewProps> = ({ onClose }) => {
    const [view, setView] = useState<ViewState>('homepage');
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [inputValue, setInputValue] = useState('');
    const [searchResults, setSearchResults] = useState<{ summary: string; results: SearchResult[] } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const currentUrl = history[historyIndex] ?? null;

    useEffect(() => {
        setInputValue(currentUrl ?? '');
    }, [currentUrl]);
    
    const navigateTo = useCallback((url: string) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(url);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setView('page');
    }, [history, historyIndex]);

    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) return;

        setView('loading');
        setErrorMessage('');
        setSearchResults(null);

        try {
            const results = await performWebSearch(query);
            setSearchResults(results);
            setView('results');
        } catch (error) {
            console.error(error);
            setErrorMessage(error instanceof Error ? error.message : "Ocurrió un error desconocido.");
            setView('error');
        }
    }, []);
    
    const handleSubmit = (value: string) => {
        try {
            // Check if it's a valid URL, if so, navigate. Otherwise, search.
            new URL(value);
            navigateTo(value);
        } catch (_) {
            handleSearch(value);
        }
    };
    
    const goBack = () => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
            setView('page');
        }
    };

    const goForward = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1);
            setView('page');
        }
    };
    
    const reload = () => {
        if (iframeRef.current) {
            iframeRef.current.src = 'about:blank';
            setTimeout(() => {
                if(iframeRef.current && currentUrl) {
                    iframeRef.current.src = currentUrl;
                }
            }, 100);
        }
    };

    const renderContent = () => {
        switch (view) {
            case 'homepage':
                return (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <SamLogo className="w-28 h-28 text-text-secondary mb-6" />
                        <h1 className="text-5xl font-bold text-text-main">SAM Navegador</h1>
                        <p className="text-text-secondary mt-2 mb-8">Navegación web impulsada por IA.</p>
                    </div>
                );
            case 'loading':
                 return (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <GlobeAltIcon className="w-16 h-16 text-accent animate-spin mb-6" />
                        <p className="text-text-secondary">Buscando en la web...</p>
                    </div>
                );
            case 'error':
                 return (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <h2 className="text-xl font-semibold text-danger">Error en la Búsqueda</h2>
                        <p className="text-text-secondary mt-2">{errorMessage}</p>
                    </div>
                 );
            case 'results':
                if (!searchResults) return null;
                return (
                    <div className="overflow-y-auto p-4 md:p-8 max-w-3xl mx-auto w-full">
                        <div className="bg-surface-primary border border-border-subtle p-4 rounded-xl mb-6">
                            <h3 className="font-semibold text-text-main flex items-center gap-2 mb-2"><SparklesIcon className="w-5 h-5 text-accent"/> Resumen de IA</h3>
                            <p className="text-text-secondary text-sm">{searchResults.summary}</p>
                        </div>
                        <div className="space-y-6">
                            {searchResults.results.map(result => (
                                <div key={result.uri}>
                                    <button onClick={() => navigateTo(result.uri)} className="group text-left">
                                        <div className="flex items-center gap-2">
                                            <img src={`https://www.google.com/s2/favicons?domain=${new URL(result.uri).hostname}&sz=32`} alt="favicon" className="w-6 h-6 rounded-full object-cover bg-surface-secondary" />
                                            <span className="text-sm text-text-main truncate">{new URL(result.uri).hostname}</span>
                                        </div>
                                        <h2 className="text-lg text-accent-blue group-hover:underline mt-1">{result.title}</h2>
                                    </button>
                                     <p className="text-sm text-text-secondary truncate mt-1">{result.uri}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'page':
                return (
                    <>
                        <div className="p-2 bg-surface-secondary border-b border-border-subtle text-sm flex items-center justify-between gap-4 flex-shrink-0">
                            <p className="text-text-secondary text-xs">
                                <span className="font-bold">Nota:</span> Algunos sitios pueden no cargar debido a restricciones de seguridad.
                            </p>
                            <a href={currentUrl!} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-accent-blue hover:underline whitespace-nowrap">Abrir en nueva pestaña</a>
                        </div>
                        <iframe ref={iframeRef} src={currentUrl!} title="SAM Browser" className="w-full h-full border-0" sandbox="allow-forms allow-scripts allow-same-origin allow-popups" />
                    </>
                )
        }
    }

    return (
        <div className="flex flex-col h-full bg-bg-main">
            <header className="flex-shrink-0 flex items-center gap-2 p-2 border-b border-border-subtle bg-surface-primary">
                <button onClick={goBack} disabled={historyIndex <= 0} className="p-2 rounded-full hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed"><ArrowLeftIcon className="w-5 h-5 text-text-main"/></button>
                <button onClick={goForward} disabled={historyIndex >= history.length - 1} className="p-2 rounded-full hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed"><ArrowRightIcon className="w-5 h-5 text-text-main"/></button>
                <button onClick={reload} disabled={!currentUrl} className="p-2 rounded-full hover:bg-surface-secondary disabled:opacity-30"><ArrowPathIcon className="w-5 h-5 text-text-main"/></button>
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input 
                        type="text" 
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit(inputValue)}
                        placeholder="Busca en SAM o escribe una URL"
                        className="w-full bg-surface-secondary border border-transparent rounded-full pl-10 pr-4 py-2 focus:ring-accent focus:border-accent outline-none text-sm"
                    />
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-secondary" aria-label="Cerrar navegador"><XMarkIcon className="w-5 h-5 text-text-main"/></button>
            </header>
            <main className="flex-1 overflow-auto flex flex-col">{renderContent()}</main>
        </div>
    );
};

export default BrowserView;