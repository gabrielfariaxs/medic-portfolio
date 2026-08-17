"use client";

import { useState } from 'react';
import { SPECS, TYPES, UFS } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  
  // Formulário de produto
  const [formData, setFormData] = useState({
    nome: '',
    marca: '',
    especialidade: SPECS[0].id,
    tipo: TYPES[0],
    tag: '',
    estados: [],
    file: null,
    pdfFile: null,
    docxFile: null,
    como: '',
    exclusivo: false,
    anvisa: ''
  });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({ ...prev, file }));
    }
  };

  const handlePdfChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const pdfFile = e.target.files[0];
      setFormData(prev => ({ ...prev, pdfFile }));
    }
  };

  const handleDocxChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const docxFile = e.target.files[0];
      setFormData(prev => ({ ...prev, docxFile }));
    }
  };

  const toggleUF = (uf) => {
    const isSelected = formData.estados.includes(uf);
    if (isSelected) {
      setFormData({ ...formData, estados: formData.estados.filter(u => u !== uf) });
    } else {
      setFormData({ ...formData, estados: [...formData.estados, uf] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    try {
      let imageUrl = null;

      // 1. Upload da imagem se houver
      if (formData.file) {
        const fileExt = formData.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `produtos/${fileName}`;

        // Assumindo que criamos um bucket chamado 'images' no Supabase
        const { error: uploadError, data } = await supabase.storage
          .from('images')
          .upload(filePath, formData.file, {
            upsert: true,
            cacheControl: '0'
          });

        if (uploadError) {
          console.error("Supabase Storage Upload Error (Admin):", uploadError);
          throw new Error('Erro ao fazer upload da imagem: ' + (uploadError.message || JSON.stringify(uploadError)) + ' (O bucket "images" foi criado e está público?)');
        }

        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        imageUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      }

      let pdfUrl = null;
      if (formData.pdfFile) {
        const fileExt = formData.pdfFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `pdfs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('docs')
          .upload(filePath, formData.pdfFile, {
            upsert: true,
            cacheControl: '0'
          });

        if (uploadError) {
          console.error("Supabase Storage Upload Error (Admin Add PDF):", uploadError);
          throw new Error('Erro ao fazer upload do PDF: ' + (uploadError.message || JSON.stringify(uploadError)));
        }

        const { data: publicUrlData } = supabase.storage
          .from('docs')
          .getPublicUrl(filePath);

        pdfUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      }

      let docxUrl = null;
      if (formData.docxFile) {
        const fileExt = formData.docxFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `modelos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('docs')
          .upload(filePath, formData.docxFile, {
            upsert: true,
            cacheControl: '0'
          });

        if (uploadError) {
          console.error("Supabase Storage Upload Error (Admin Add DOCX):", uploadError);
          throw new Error('Erro ao fazer upload do Modelo de Pedido: ' + (uploadError.message || JSON.stringify(uploadError)));
        }

        const { data: publicUrlData } = supabase.storage
          .from('docs')
          .getPublicUrl(filePath);

        docxUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      }

      const prodId = 'prod-' + Date.now();

      const { error: dbError } = await supabase
        .from('produtos')
        .insert([{
          id: prodId,
          nome: formData.nome,
          marca: formData.marca,
          especialidade: formData.especialidade,
          tipo: formData.tipo,
          tag: formData.tag,
          estados: formData.estados,
          imagem_url: imageUrl,
          tecnica_url: pdfUrl,
          modelo_pedido_url: docxUrl,
          como: formData.como,
          anvisa: formData.anvisa,
          exclusivo: formData.exclusivo
        }]);

      if (dbError) {
        console.error("Supabase Database Save Error (Admin Add):", dbError);
        throw new Error('Erro ao salvar produto no banco: ' + dbError.message);
      }

      console.log("DADOS DO PRODUTO A SALVAR NO SUPABASE:", { ...formData, imageUrl, docxUrl });
      
      setSuccess('Produto adicionado com sucesso!');
      
      // Limpar formulário
      setFormData({
        nome: '',
        marca: '',
        especialidade: SPECS[0].id,
        tipo: TYPES[0],
        tag: '',
        estados: [],
        file: null,
        pdfFile: null,
        docxFile: null,
        como: '',
        exclusivo: false,
        anvisa: ''
      });

    } catch (err) {
      alert(err.message || 'Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  // Exportar produto para PDF (Exemplo de catálogo simples)
  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Medic - Catálogo de Produtos", 20, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Este é um PDF gerado automaticamente contendo os produtos recentes.", 20, 30);
    
    doc.save("Medic_Catalogo.pdf");
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = "/login";
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <header style={{ background: 'var(--surface)', padding: '15px 30px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Painel de Administração</h1>
        <div>
          <button onClick={exportPdf} style={{ marginRight: '15px', padding: '8px 16px', background: 'var(--verde)', color: '#000', borderRadius: '8px', fontWeight: 700 }}>
            Gerar PDF
          </button>
          <button onClick={handleLogout} style={{ padding: '8px 16px', border: '1.5px solid var(--line)', borderRadius: '8px', fontWeight: 700 }}>
            Sair
          </button>
        </div>
      </header>

      <main style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ background: 'var(--surface)', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 22px rgba(20,22,31,.06)' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '25px' }}>Adicionar Novo Produto</h2>
          
          {success && (
            <div style={{ background: '#dcfce7', color: '#166534', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontWeight: 600 }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink-2)' }}>Nome do Produto</label>
                <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink-2)' }}>Fabricante / Marca</label>
                <input required type="text" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink-2)' }}>Especialidade</label>
                <select value={formData.especialidade} onChange={e => setFormData({...formData, especialidade: e.target.value})} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }}>
                  {SPECS.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink-2)' }}>Tipo</label>
                <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }}>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink-2)' }}>Breve Descrição (Tag)</label>
                <input type="text" value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink-2)' }}>Nº Registro ANVISA</label>
                <input type="text" value={formData.anvisa} onChange={e => setFormData({...formData, anvisa: e.target.value})} placeholder="Ex: 10000000000" style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink-2)' }}>Como solicitar corretamente (opcional)</label>
              <textarea value={formData.como} onChange={e => setFormData({...formData, como: e.target.value})} rows="3" placeholder="Defina aqui a forma correta de solicitação deste produto — código, embalagem, prazo de pedido e canal." style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}></textarea>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: 'var(--ink-2)' }}>
                <input type="checkbox" checked={formData.exclusivo} onChange={e => setFormData({...formData, exclusivo: e.target.checked})} style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                Produto Exclusivo Medic
              </label>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink-2)' }}>Estados de Disponibilidade</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {UFS.map(uf => (
                  <button 
                    key={uf} 
                    type="button"
                    onClick={() => toggleUF(uf)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid',
                      borderColor: formData.estados.includes(uf) ? 'var(--azul)' : 'var(--line)',
                      background: formData.estados.includes(uf) ? '#eff6ff' : 'var(--surface-2)',
                      color: formData.estados.includes(uf) ? 'var(--azul)' : 'var(--ink-2)',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    {uf}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink-2)' }}>Foto do Produto (Tire do celular ou envie do PC)</label>
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ width: '100%', padding: '12px 14px', border: '1.5px dashed var(--azul)', borderRadius: '8px', fontSize: '14px', background: '#f8fafc' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink-2)' }}>Técnica Cirúrgica (Opcional - Apenas PDF)</label>
              <input type="file" accept="application/pdf" onChange={handlePdfChange} style={{ width: '100%', padding: '12px 14px', border: '1.5px dashed var(--azul)', borderRadius: '8px', fontSize: '14px', background: '#f8fafc' }} />
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink-2)' }}>Modelo de Pedido (Opcional - Apenas DOCX)</label>
              <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleDocxChange} style={{ width: '100%', padding: '12px 14px', border: '1.5px dashed var(--azul)', borderRadius: '8px', fontSize: '14px', background: '#f8fafc' }} />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ width: '100%', padding: '14px', background: 'var(--grad)', color: '#fff', borderRadius: '999px', fontSize: '15px', fontWeight: 800, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Salvando e fazendo upload...' : 'Adicionar Produto ao Catálogo'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
