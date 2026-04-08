"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, FileText, Globe, Eye, Trash2 } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

export default function BlogAdminPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    resumen: "",
    contenido: "",
    imagen_url: "",
    publicado: false
  });

  const supabase = createSupabaseBrowser();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setPosts(data);
    setLoading(false);
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const slug = generateSlug(formData.titulo);

    const { error } = await supabase
      .from('blog_posts')
      .insert([{
        ...formData,
        slug
      }]);

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      setIsModalOpen(false);
      setFormData({ titulo: "", resumen: "", contenido: "", imagen_url: "", publicado: false });
      fetchPosts();
    }
    setSaving(false);
  };

  const deletePost = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este artículo?")) return;
    await supabase.from('blog_posts').delete().eq('id', id);
    fetchPosts();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-montserrat">Editor de Blog</h1>
          <p className="text-muted-foreground">Escribe casos de éxito y artículos para mejorar tu SEO.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="rounded-full px-6 flex items-center gap-2">
           <Plus className="h-4 w-4" /> Nuevo Artículo
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
             <p className="text-center py-20 col-span-full">Cargando artículos...</p>
        ) : posts.length === 0 ? (
             <div className="col-span-full text-center py-20 border-2 border-dashed border-border/50 rounded-3xl opacity-50">
                <FileText className="h-16 w-16 mx-auto mb-4" />
                <p className="font-bold">No hay artículos publicados.</p>
                <p className="text-sm">Comienza a escribir para atraer más pacientes.</p>
             </div>
        ) : (
            posts.map((post) => (
                <Card key={post.id} className="overflow-hidden glass border-none shadow-lg group">
                    <div className="h-40 bg-secondary/50 relative">
                        {post.imagen_url ? (
                            <img src={post.imagen_url} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground italic">Sin imagen de portada</div>
                        )}
                        <div className="absolute top-2 right-2">
                             <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${post.publicado ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
                                {post.publicado ? 'Publicado' : 'Borrador'}
                             </span>
                        </div>
                    </div>
                    <CardContent className="p-4 space-y-4">
                        <div>
                            <h3 className="font-bold text-lg line-clamp-2">{post.titulo}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{post.resumen}</p>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-border/50">
                            <span className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</span>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                                <Button onClick={() => deletePost(post.id)} variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>Nuevo Artículo</DialogTitle>
            <DialogDescription>Crea contenido de valor para tus pacientes.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePost} className="space-y-6 py-4">
            <div className="space-y-2">
                <label className="text-sm font-bold">Título del Artículo</label>
                <input required className="w-full p-3 rounded-2xl bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-primary text-xl font-bold"
                    value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-bold">Resumen corto</label>
                    <textarea className="w-full p-3 rounded-xl bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-primary h-24"
                        value={formData.resumen} onChange={(e) => setFormData({...formData, resumen: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold">URL de Imagen (Unsplash)</label>
                    <input className="w-full p-3 rounded-xl bg-secondary/50 border border-border/50 outline-none focus:ring-2 focus:ring-primary"
                        value={formData.imagen_url} onChange={(e) => setFormData({...formData, imagen_url: e.target.value})} placeholder="https://..." />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold">Contenido del Artículo</label>
                <textarea required className="w-full p-4 rounded-3xl bg-secondary/20 border border-border/50 outline-none focus:ring-2 focus:ring-primary min-h-[300px]"
                    value={formData.contenido} onChange={(e) => setFormData({...formData, contenido: e.target.value})} placeholder="Escribe aquí..." />
            </div>

            <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-2xl border border-primary/20">
                <input type="checkbox" id="pub" checked={formData.publicado} onChange={(e) => setFormData({...formData, publicado: e.target.checked})} className="h-5 w-5 rounded-md text-primary" />
                <label htmlFor="pub" className="font-bold cursor-pointer">Publicar inmediatamente</label>
                <Globe className="h-4 w-4 ml-auto text-primary" />
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full rounded-3xl py-6 font-bold text-lg" disabled={saving}>
                {saving ? "Guardando..." : "Guardar Artículo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
