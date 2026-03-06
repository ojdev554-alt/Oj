import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Video, 
  Music, 
  Mic, 
  Share2, 
  TrendingUp, 
  Calendar, 
  Settings, 
  Home, 
  Sparkles, 
  Loader2, 
  Play, 
  Download,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  History,
  Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  generateScript, 
  generateVoiceover, 
  generateThumbnail, 
  startVideoGeneration, 
  pollVideoStatus, 
  analyzeVirality,
  VideoScript 
} from './services/gemini';
import { cn } from './lib/utils';

// --- Types ---
interface GeneratedVideo {
  id: string;
  topic: string;
  category: string;
  script: VideoScript;
  voiceoverUrl: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  virality: {
    score: number;
    hashtags: string[];
    suggestions: string[];
  };
  createdAt: number;
}

const CATEGORIES = [
  'Motivation', 'Education', 'Story', 'Comedy', 'Facts', 'News', 'Gaming'
];

const VOICES = [
  { id: 'Kore', name: 'Kore (Female, Energetic)', gender: 'female' },
  { id: 'Fenrir', name: 'Fenrir (Male, Deep)', gender: 'male' },
  { id: 'Puck', name: 'Puck (Male, Friendly)', gender: 'male' },
  { id: 'Charon', name: 'Charon (Male, Documentary)', gender: 'male' },
  { id: 'Zephyr', name: 'Zephyr (Female, Calm)', gender: 'female' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'create' | 'history' | 'calendar'>('home');
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [voice, setVoice] = useState(VOICES[0].id);
  
  // Creation States
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [currentScript, setCurrentScript] = useState<VideoScript | null>(null);
  const [currentVoiceover, setCurrentVoiceover] = useState<string | null>(null);
  const [currentThumbnail, setCurrentThumbnail] = useState<string | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [currentVirality, setCurrentVirality] = useState<any>(null);

  const handleCreateVideo = async () => {
    try {
      setIsCreating(true);
      setStep(1);
      setLoadingStatus('Generating viral script...');
      
      // 1. Script
      const script = await generateScript(topic, category);
      setCurrentScript(script);
      setStep(2);

      // 2. Voiceover & Virality Analysis (Parallel)
      setLoadingStatus('Generating voiceover & analyzing virality...');
      const [voiceover, virality] = await Promise.all([
        generateVoiceover(script.fullScript, voice),
        analyzeVirality(script.fullScript)
      ]);
      setCurrentVoiceover(voiceover);
      setCurrentVirality(virality);
      setStep(3);

      // 3. Thumbnail
      setLoadingStatus('Designing high-click thumbnail...');
      const thumbnail = await generateThumbnail(script.visualPrompt);
      setCurrentThumbnail(thumbnail);
      setStep(4);

      // 4. Video Generation (Veo)
      setLoadingStatus('Synthesizing video with Veo (this may take a few minutes)...');
      const operation = await startVideoGeneration(script.visualPrompt);
      const finishedOp = await pollVideoStatus(operation);
      
      const downloadLink = finishedOp.response?.generatedVideos?.[0]?.video?.uri;
      let finalVideoUrl = null;
      if (downloadLink) {
        finalVideoUrl = downloadLink;
      }
      setCurrentVideoUrl(finalVideoUrl);
      setStep(5);

      // Save to history
      const newVideo: GeneratedVideo = {
        id: Math.random().toString(36).substr(2, 9),
        topic,
        category,
        script,
        voiceoverUrl: voiceover,
        thumbnailUrl: thumbnail,
        videoUrl: finalVideoUrl,
        virality,
        createdAt: Date.now(),
      };
      setVideos([newVideo, ...videos]);
      setLoadingStatus('Video ready!');
    } catch (error) {
      console.error('Creation failed:', error);
      setLoadingStatus('Error occurred during generation.');
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreation = () => {
    setTopic('');
    setCurrentScript(null);
    setCurrentVoiceover(null);
    setCurrentThumbnail(null);
    setCurrentVideoUrl(null);
    setCurrentVirality(null);
    setStep(1);
    setLoadingStatus('');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30">
      {/* Sidebar / Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 md:top-0 md:bottom-0 md:left-0 md:w-20 md:border-r md:border-t-0 flex md:flex-col items-center justify-around md:justify-center gap-8 p-4">
        <NavItem icon={Home} active={activeTab === 'home'} onClick={() => setActiveTab('home')} label="Home" />
        <NavItem icon={Plus} active={activeTab === 'create'} onClick={() => setActiveTab('create')} label="Create" primary />
        <NavItem icon={History} active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="History" />
        <NavItem icon={Calendar} active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} label="Calendar" />
      </nav>

      {/* Main Content */}
      <main className="pb-24 md:pb-0 md:pl-20 min-h-screen">
        <div className="max-w-6xl mx-auto p-6 md:p-12">
          
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <header className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm tracking-widest uppercase">
                    <Sparkles className="w-4 h-4" />
                    <span>AI-Powered Video Studio</span>
                  </div>
                  <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-none">
                    VIRAL<br />SHORTS
                  </h1>
                  <p className="text-zinc-400 max-w-md text-lg">
                    Turn any idea into a high-engagement short video in seconds. Powered by Gemini & Veo.
                  </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FeatureCard 
                    icon={TrendingUp} 
                    title="Viral Prediction" 
                    desc="Our AI scores your content's potential before you post."
                  />
                  <FeatureCard 
                    icon={Mic} 
                    title="Pro Voiceovers" 
                    desc="Natural, energetic voices that keep viewers hooked."
                  />
                  <FeatureCard 
                    icon={Video} 
                    title="Veo Synthesis" 
                    desc="Cinematic video generation tailored to your script."
                  />
                </div>

                <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Ready to go viral?</h2>
                    <p className="text-zinc-400">Start creating your next masterpiece now.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('create')}
                    className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform flex items-center gap-2"
                  >
                    Create New Video <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'create' && (
              <motion.div 
                key="create"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="max-w-4xl mx-auto"
              >
                <div className="bg-zinc-900/30 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-sm">
                  <div className="p-8 md:p-12 space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-bold tracking-tight">Create Video</h2>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <div key={s} className={cn("w-8 h-1 rounded-full transition-colors", step >= s ? "bg-emerald-500" : "bg-white/10")} />
                        ))}
                      </div>
                    </div>

                    {!isCreating && step === 1 && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-4">
                          <label className="text-sm font-medium text-zinc-500 uppercase tracking-widest">What's the topic?</label>
                          <textarea 
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. 5 Mind-blowing facts about the deep ocean..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[150px] resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <label className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Category</label>
                            <div className="grid grid-cols-2 gap-2">
                              {CATEGORIES.map(cat => (
                                <button
                                  key={cat}
                                  onClick={() => setCategory(cat)}
                                  className={cn(
                                    "px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                                    category === cat ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                                  )}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Voice Style</label>
                            <div className="space-y-2">
                              {VOICES.map(v => (
                                <button
                                  key={v.id}
                                  onClick={() => setVoice(v.id)}
                                  className={cn(
                                    "w-full px-4 py-3 rounded-xl text-left text-sm font-medium border transition-all flex items-center justify-between",
                                    voice === v.id ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                                  )}
                                >
                                  {v.name}
                                  {voice === v.id && <CheckCircle2 className="w-4 h-4" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <button
                          disabled={!topic}
                          onClick={handleCreateVideo}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-5 rounded-2xl text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                          Generate Viral Video <Sparkles className="w-5 h-5" />
                        </button>
                      </div>
                    )}

                    {isCreating && (
                      <div className="py-20 flex flex-col items-center justify-center space-y-8 text-center">
                        <div className="relative">
                          <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
                          <div className="absolute inset-0 blur-2xl bg-emerald-500/20 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-2xl font-bold">{loadingStatus}</h3>
                          <p className="text-zinc-500">Our AI is crafting your masterpiece. This usually takes 1-3 minutes.</p>
                        </div>
                        <div className="w-full max-w-xs bg-white/5 h-1 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-emerald-500"
                            initial={{ width: "0%" }}
                            animate={{ width: `${(step / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {!isCreating && step === 5 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in zoom-in-95 duration-500">
                        {/* Preview */}
                        <div className="space-y-6">
                          <div className="aspect-[9/16] bg-black rounded-[2rem] border border-white/10 overflow-hidden relative group">
                            {currentVideoUrl ? (
                              <video 
                                src={currentVideoUrl} 
                                controls 
                                className="w-full h-full object-cover"
                                poster={currentThumbnail || undefined}
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                                {currentThumbnail ? (
                                  <img src={currentThumbnail} alt="Thumbnail" className="absolute inset-0 w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" />
                                ) : (
                                  <Video className="w-12 h-12 text-zinc-700" />
                                )}
                                <div className="relative z-10">
                                  <p className="font-bold text-xl">Video Generated!</p>
                                  <p className="text-sm text-zinc-400">Preview might be unavailable in this environment, but your video is ready for export.</p>
                                </div>
                              </div>
                            )}
                            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
                              9:16 Vertical
                            </div>
                          </div>
                          
                          <div className="flex gap-4">
                            <button className="flex-1 bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                              <Download className="w-5 h-5" /> Download
                            </button>
                            <button className="flex-1 bg-zinc-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors">
                              <Share2 className="w-5 h-5" /> Share
                            </button>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-8">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Viral Score</h3>
                              <span className={cn(
                                "text-2xl font-black",
                                currentVirality?.score > 80 ? "text-emerald-400" : "text-yellow-400"
                              )}>
                                {currentVirality?.score}%
                              </span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-emerald-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${currentVirality?.score}%` }}
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Hashtags</h3>
                            <div className="flex flex-wrap gap-2">
                              {currentVirality?.hashtags.map((tag: string) => (
                                <span key={tag} className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg text-sm font-mono">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Script Hook</h3>
                            <p className="text-lg font-medium italic text-zinc-300 leading-relaxed">
                              "{currentScript?.hook}"
                            </p>
                          </div>

                          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                              <Sparkles className="w-4 h-4" /> AI Suggestions
                            </h3>
                            <ul className="space-y-2">
                              {currentVirality?.suggestions.map((s: string, i: number) => (
                                <li key={i} className="text-sm text-zinc-400 flex gap-2">
                                  <span className="text-emerald-500">•</span> {s}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <button 
                            onClick={resetCreation}
                            className="w-full py-4 text-zinc-500 hover:text-white transition-colors text-sm font-medium"
                          >
                            Create Another Video
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-bold tracking-tight">Your Creations</h2>
                  <span className="text-zinc-500 font-mono">{videos.length} Videos</span>
                </div>

                {videos.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <History className="w-12 h-12 text-zinc-800 mx-auto" />
                    <p className="text-zinc-500">No videos generated yet. Start creating!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {videos.map(v => (
                      <div key={v.id} className="group relative aspect-[9/16] bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 hover:border-emerald-500/50 transition-all cursor-pointer">
                        {v.thumbnailUrl && (
                          <img src={v.thumbnailUrl} alt={v.topic} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 flex flex-col justify-end">
                          <p className="font-bold text-sm line-clamp-2">{v.topic}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-zinc-400 uppercase tracking-widest">{v.category}</span>
                            <span className="text-[10px] text-emerald-400 font-bold">{v.virality.score}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'calendar' && (
              <motion.div 
                key="calendar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-bold tracking-tight">Content Calendar</h2>
                  <button className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-sm transition-colors">
                    Generate Ideas
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 min-h-[150px] space-y-4">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{day}</span>
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase">Idea</p>
                        <p className="text-xs text-zinc-300">Space exploration facts...</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}

function NavItem({ icon: Icon, active, onClick, label, primary = false }: { icon: any, active: boolean, onClick: () => void, label: string, primary?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1 transition-all group",
        active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      <div className={cn(
        "p-3 rounded-2xl transition-all",
        primary ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : 
        active ? "bg-white/10" : "group-hover:bg-white/5"
      )}>
        <Icon className={cn("w-6 h-6", primary && "fill-current")} />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">{label}</span>
      {active && !primary && (
        <motion.div layoutId="nav-active" className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-full hidden md:block" />
      )}
    </button>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2rem] space-y-4 hover:border-white/10 transition-colors">
      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-emerald-400">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
