import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useListKits, useCreateKit, useDeleteKit, useGetKit, useUploadSample, useDeleteSample } from "@workspace/api-client-react";
import { instrumentsFor } from "@workspace/engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AudioLines, Plus, Trash2, Library as LibIcon, UploadCloud, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { STARTER_KITS } from "@/audio/kits";
import { SAMPLE_CONTRIBUTOR_LICENSE } from "@/lib/license";

export default function Sounds() {
  const { isAuthenticated } = useAuth();
  const { data: customKits, isLoading, refetch } = useListKits({ 
    query: { enabled: isAuthenticated, queryKey: ['listKits'] } 
  });
  
  const createKit = useCreateKit();
  const deleteKit = useDeleteKit();

  const [newKitName, setNewKitName] = useState("");
  const [newKitTradition, setNewKitTradition] = useState<"samba" | "arabic">("samba");
  const [isCreating, setIsCreating] = useState(false);

  const [expandedKitId, setExpandedKitId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newKitName.trim()) return;
    setIsCreating(true);
    createKit.mutate(
      { data: { name: newKitName, tradition: newKitTradition } },
      {
        onSuccess: () => {
          setNewKitName("");
          setIsCreating(false);
          refetch();
        },
        onError: () => setIsCreating(false)
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteKit.mutate({ id }, { onSuccess: () => refetch() });
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto space-y-12">
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <AudioLines className="w-8 h-8 text-primary" />
            Sound Kits
          </h1>
          <p className="text-muted-foreground font-light text-lg">
            Built-in modal synthesis kits and your custom sample libraries.
          </p>
        </div>

        {/* Built-in Kits */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold font-mono uppercase tracking-widest text-foreground/80 flex items-center gap-2 border-b border-border pb-4">
            <LibIcon className="w-5 h-5 text-primary" /> Built-In Synthesis
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {STARTER_KITS.map((kit) => (
              <Card key={kit.id} className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className={kit.tradition === 'samba' ? 'text-primary' : 'text-secondary'}>
                      {kit.name}
                    </span>
                  </CardTitle>
                  <CardDescription>{kit.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="font-mono text-xs text-muted-foreground bg-muted p-3 rounded-md flex justify-between">
                    <span>Engine: Modal Synthesis</span>
                    <span>No files loaded</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Custom Kits */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-xl font-bold font-mono uppercase tracking-widest text-foreground/80 flex items-center gap-2">
              <AudioLines className="w-5 h-5 text-secondary" /> Custom Sample Kits
            </h2>
          </div>

          {!isAuthenticated ? (
            <div className="p-8 text-center border border-dashed border-border rounded-lg bg-card/30">
              <p className="font-mono text-sm text-muted-foreground mb-4">Sign in to create and upload custom sample kits.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Create Kit Form */}
              <Card className="bg-card border-border">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end md:items-center">
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-xs font-mono text-muted-foreground uppercase">Kit Name</label>
                    <Input 
                      value={newKitName} 
                      onChange={e => setNewKitName(e.target.value)} 
                      placeholder="My Custom Kit" 
                      className="font-mono bg-background"
                    />
                  </div>
                  <div className="w-full md:w-48 space-y-1">
                    <label className="text-xs font-mono text-muted-foreground uppercase">Tradition</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={newKitTradition}
                      onChange={(e) => setNewKitTradition(e.target.value as "samba" | "arabic")}
                    >
                      <option value="samba">Samba</option>
                      <option value="arabic">Arabic</option>
                    </select>
                  </div>
                  <Button 
                    onClick={handleCreate} 
                    disabled={isCreating || !newKitName.trim()}
                    className="w-full md:w-auto font-mono uppercase tracking-widest"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Create Kit
                  </Button>
                </CardContent>
              </Card>

              {/* Kit List */}
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
                </div>
              ) : customKits?.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-lg">
                  <p className="font-mono text-sm text-muted-foreground">You haven't created any custom kits yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customKits?.map((kit) => (
                    <Card key={kit.id} className="border-border bg-card overflow-hidden">
                      <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setExpandedKitId(expandedKitId === kit.id ? null : kit.id)}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                              {expandedKitId === kit.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                            <div>
                              <CardTitle className="text-foreground">{kit.name}</CardTitle>
                              <CardDescription className="uppercase text-xs tracking-widest mt-1">
                                {kit.tradition} • {kit.sampleCount} samples
                              </CardDescription>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); handleDelete(kit.id); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      
                      {expandedKitId === kit.id && (
                        <CardContent className="border-t border-border pt-6 pb-6 bg-background/50">
                          <KitManager kitId={kit.id} />
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function KitManager({ kitId }: { kitId: string }) {
  const { data: kit, isLoading, refetch } = useGetKit(kitId, { query: { queryKey: ["kit", kitId] } });
  const uploadSample = useUploadSample();
  const deleteSample = useDeleteSample();

  const [instrument, setInstrument] = useState("surdo1");
  const [band, setBand] = useState("3");
  const [file, setFile] = useState<File | null>(null);
  const [acceptedLicense, setAcceptedLicense] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !acceptedLicense) return;
    setIsUploading(true);
    
    try {
      await uploadSample.mutateAsync({
        id: kitId,
        data: {
          file: file,
          instrument,
          band: band,
          licenseAccepted: "true"
        }
      });
      // Reset form
      setFile(null);
      setAcceptedLicense(false);
      await refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Upload Form */}
        <div className="space-y-4">
          <h4 className="font-mono text-sm uppercase font-bold text-foreground/80 flex items-center gap-2">
            <UploadCloud className="w-4 h-4" /> Upload Sample
          </h4>
          
            <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground uppercase">Instrument</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" value={instrument} onChange={e => setInstrument(e.target.value)}>
                {instrumentsFor(kit?.tradition ?? "samba").map((item) => <option key={item.id} value={item.id}>{item.id} — {item.localName}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground uppercase">Velocity Band (0-3)</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={band}
                onChange={(e) => setBand(e.target.value)}
              >
                <option value="0">0 (Softest)</option>
                <option value="1">1 (Medium Soft)</option>
                <option value="2">2 (Medium Loud)</option>
                <option value="3">3 (Loudest)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-muted-foreground uppercase">Audio File</label>
            <div className="flex items-center gap-2">
              <Input 
                type="file" 
                accept="audio/*" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="font-mono bg-background cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="h-32 overflow-y-auto p-3 text-[10px] font-mono leading-relaxed bg-muted border border-border rounded mb-3 text-muted-foreground whitespace-pre-wrap">
              {SAMPLE_CONTRIBUTOR_LICENSE}
            </div>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                className="mt-1 w-4 h-4 rounded border-border bg-background checked:bg-primary"
                checked={acceptedLicense}
                onChange={(e) => setAcceptedLicense(e.target.checked)}
              />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                I have read and accept the Sample Contributor License. I confirm I have the right to upload and share this audio file.
              </span>
            </label>
          </div>

          <Button 
            className="w-full font-mono uppercase text-xs tracking-widest mt-2" 
            disabled={!file || !acceptedLicense || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? "Uploading..." : "Upload File"}
          </Button>
        </div>

        {/* Existing Samples List */}
        <div className="space-y-4">
          <h4 className="font-mono text-sm uppercase font-bold text-foreground/80 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" /> Active Samples
          </h4>
          
           <div className="bg-card border border-border rounded-lg p-4 min-h-[300px]">
             {isLoading ? <div className="h-20 rounded bg-muted animate-pulse" /> : kit?.samples.length ? (
               <div className="space-y-2">
                 {kit.samples.map((sample) => (
                   <div key={sample.id} className="flex items-center justify-between gap-3 rounded border border-border p-2 text-xs font-mono">
                     <span className="truncate">{sample.instrument} · band {sample.band} · {sample.originalName}</span>
                     <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={async () => { await deleteSample.mutateAsync({ id: sample.id }); await refetch(); }}>
                       <Trash2 className="w-3 h-3" />
                     </Button>
                   </div>
                 ))}
               </div>
             ) : <p className="text-center font-mono text-xs text-muted-foreground pt-10">No samples in this kit yet.</p>}
           </div>
        </div>

      </div>
    </div>
  );
}
