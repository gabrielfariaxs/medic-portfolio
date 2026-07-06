"use client";

import { useState, useEffect } from "react";
import { SPECS, TYPES, BADGES, INITIAL_PRODUCTS, UFS, badgeMeta, ICN, INITIAL_IMG, INITIAL_UF } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";

const getBase64Image = (imgUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = imgUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL("image/jpeg");
      resolve(dataURL);
    };
    img.onerror = () => {
      resolve(null);
    };
  });
};

export default function Home() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [search, setSearch] = useState("");
  const [activeSpec, setActiveSpec] = useState("");
  const [activeType, setActiveType] = useState("");
  const [activeUf, setActiveUf] = useState("");
  const [activeBadge, setActiveBadge] = useState("");
  const [railOpen, setRailOpen] = useState(false);
  
  // Auth & Admin UI
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Drawer (Product Details)
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Product Form state (Add & Edit)
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    nome: '',
    marca: '',
    especialidade: SPECS[0].id,
    tipo: TYPES[0],
    tag: '',
    estados: [],
    file: null
  });

  useEffect(() => {
    fetch('/api/auth/check')
      .then(res => res.json())
      .then(data => {
        if (data.isAdmin) setIsAdmin(true);
      });
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, file: e.target.files[0] });
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

  const openEditModal = (p) => {
    setEditingProduct(p);
    setFormData({
      nome: p.n,
      marca: p.m,
      especialidade: p.e,
      tipo: p.t,
      tag: p.tag || '',
      estados: INITIAL_UF[p.id] || [],
      file: null
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    try {
      let imageUrl = null;
      if (formData.file) {
        const fileExt = formData.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `produtos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, formData.file);

        if (uploadError) {
          console.error("Supabase Storage Upload Error (Add):", uploadError);
          throw new Error('Erro ao fazer upload da imagem: ' + (uploadError.message || JSON.stringify(uploadError)));
        }

        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      }

      const novoProduto = {
        id: 'prod-' + Date.now(),
        n: formData.nome,
        m: formData.marca,
        e: formData.especialidade,
        t: formData.tipo,
        tag: formData.tag,
        img: imageUrl
      };

      setProducts(prev => [novoProduto, ...prev]);
      setSuccess('Produto adicionado ao catálogo!');
      
      setFormData({
        nome: '',
        marca: '',
        especialidade: SPECS[0].id,
        tipo: TYPES[0],
        tag: '',
        estados: [],
        file: null
      });

      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess('');
      }, 2000);

    } catch (err) {
      alert(err.message || 'Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    try {
      let imageUrl = editingProduct.img || getImg(editingProduct);
      
      if (formData.file) {
        const fileExt = formData.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `produtos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, formData.file);

        if (uploadError) {
          console.error("Supabase Storage Upload Error (Edit):", uploadError);
          throw new Error('Erro ao enviar nova imagem: ' + (uploadError.message || JSON.stringify(uploadError)));
        }

        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      }

      const updatedProducts = products.map(p => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            n: formData.nome,
            m: formData.marca,
            e: formData.especialidade,
            t: formData.tipo,
            tag: formData.tag,
            img: imageUrl
          };
        }
        return p;
      });

      setProducts(updatedProducts);
      if (selectedProduct && selectedProduct.id === editingProduct.id) {
        setSelectedProduct({
          ...selectedProduct,
          n: formData.nome,
          m: formData.marca,
          e: formData.especialidade,
          t: formData.tipo,
          tag: formData.tag,
          img: imageUrl
        });
      }

      INITIAL_UF[editingProduct.id] = formData.estados;
      setSuccess('Produto editado com sucesso!');

      setTimeout(() => {
        setEditingProduct(null);
        setSuccess('');
      }, 2000);

    } catch (err) {
      alert(err.message || 'Erro ao editar produto');
    } finally {
      setLoading(false);
    }
  };

  // Lógica de Filtros
  const filteredProducts = products.filter((p) => {
    if (activeSpec && p.e !== activeSpec) return false;
    if (activeType && p.t !== activeType) return false;
    if (activeBadge) {
      if (activeBadge === "novo" && (!p.b || !p.b.includes("novo"))) return false;
      if (activeBadge === "top" && (!p.b || !p.b.includes("top"))) return false;
      if (activeBadge === "premium" && (!p.b || !p.b.includes("premium"))) return false;
    }
    if (activeUf) {
      const uf = INITIAL_UF[p.id];
      if (!uf || !uf.includes(activeUf)) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      if (!p.n.toLowerCase().includes(s) && !p.m.toLowerCase().includes(s) && !(p.tag && p.tag.toLowerCase().includes(s))) {
        return false;
      }
    }
    return true;
  });

  const getSpec = (id) => SPECS.find((s) => s.id === id);

  const getImg = (p) => {
    if (p.img) return p.img;
    if (INITIAL_IMG[p.id]) return `/images/${INITIAL_IMG[p.id]}`;
    return null;
  };

  const getResumoTexto = (p) => {
    let t = '*' + p.n + '*  ·  ' + (p.m !== '—' ? p.m : 'Curadoria Arthromed') + '\n';
    if (p.b && p.b.includes('exclusivo')) t += '★ Exclusividade Arthromed\n';
    t += p.tag + '\n';
    t += 'Especialidade: ' + (getSpec(p.e)?.nome || '') + '  |  Categoria: ' + p.t + '\n';
    if (p.mat) t += 'Material: ' + p.mat + '\n';
    const uf = INITIAL_UF[p.id] || [];
    t += 'Disponível em: ' + (uf.length ? uf.join(', ') : 'a confirmar') + '\n';
    if (p.res) t += '\n' + p.res + '\n';
    
    const blk = (label, arr) => { if (arr && arr.length) { t += '\n' + label + ':\n' + arr.map(x => '• ' + x).join('\n') + '\n'; } };
    blk('Destaques', p.d); 
    blk('Indicações', p.ind); 
    blk('Aplicações', p.apl); 
    blk('Diferenciais', p.dif);
    if (p.cod) t += '\nCódigos:\n' + p.cod.map(c => '• ' + c[0] + ' — ' + c[1]).join('\n') + '\n';
    
    if (p.como) t += '\nComo solicitar:\n' + p.como + '\n';
    t += '\nArthromed Material Médico · (81) 98923-6136';
    return t;
  };

  const copyResumo = (p) => {
    const txt = getResumoTexto(p);
    navigator.clipboard.writeText(txt).then(() => {
      alert('Resumo copiado com sucesso!');
    });
  };

  const shareProduct = (p) => {
    const txt = getResumoTexto(p);
    window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener');
  };

  const downloadProductPDF = async (p) => {
    const doc = new jsPDF();
    const spec = getSpec(p.e);
    const ufs = INITIAL_UF[p.id] || [];

    const imgUrl = getImg(p);
    let base64Img = null;
    if (imgUrl) {
      base64Img = await getBase64Image(imgUrl);
    }

    doc.setFillColor(31, 41, 222);
    doc.rect(0, 0, 210, 16, 'F');

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 26, 60, 60, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, 26, 60, 60, 3, 3, 'S');

    if (base64Img) {
      try {
        doc.addImage(base64Img, 'JPEG', 18, 29, 54, 54);
      } catch (e) {
        console.error("Erro ao adicionar imagem ao PDF:", e);
      }
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text(p.t.toUpperCase(), 33, 58);
    }

    doc.setFillColor(239, 246, 255);
    doc.roundedRect(85, 26, 28, 6, 1, 1, 'F');
    doc.setTextColor(31, 41, 222);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(p.t.toUpperCase(), 88, 30.5);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(p.n, 85, 39, { maxWidth: 110 });

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.text(p.tag || '', 85, 46, { maxWidth: 110 });

    let techY = 56;
    doc.setDrawColor(241, 245, 249);
    doc.line(85, techY, 195, techY);
    techY += 5;

    const renderSpecRow = (label, val) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text(label, 85, techY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text(val, 112, techY);
      techY += 5;
    };

    renderSpecRow("Fabricante:", p.m !== '—' ? p.m : 'Curadoria Arthromed');
    renderSpecRow("Material:", p.mat || 'Sob consulta');
    renderSpecRow("Reg. ANVISA:", 'Sob consulta');

    let curY = 96;

    const checkPage = (heightNeeded) => {
      if (curY + heightNeeded > 275) {
        doc.addPage();
        curY = 20;
      }
    };

    if (p.res) {
      const splitText = doc.splitTextToSize(p.res, 180);
      const textHeight = splitText.length * 5;
      checkPage(textHeight + 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("Descrição Geral", 15, curY);
      curY += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      doc.text(splitText, 15, curY);
      curY += textHeight + 10;
    }

    if (p.d && p.d.length > 0) {
      checkPage(p.d.length * 6 + 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("Destaques Técnicos", 15, curY);
      curY += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      p.d.forEach(item => {
        const splitItem = doc.splitTextToSize(`•  ${item}`, 180);
        doc.text(splitItem, 15, curY);
        curY += splitItem.length * 5;
      });
      curY += 8;
    }

    if (p.ind && p.ind.length > 0) {
      checkPage(p.ind.length * 6 + 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("Indicações Clínicas", 15, curY);
      curY += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      p.ind.forEach(item => {
        const splitItem = doc.splitTextToSize(`•  ${item}`, 180);
        doc.text(splitItem, 15, curY);
        curY += splitItem.length * 5;
      });
      curY += 8;
    }

    const como = p.como || 'Consulte o especialista de produto para códigos de solicitação, prazos de consignação e agendamento de suporte.';
    const splitComo = doc.splitTextToSize(como, 170);
    const boxHeight = (splitComo.length * 5) + 12;
    checkPage(boxHeight + 5);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, curY, 180, boxHeight, 2, 2, 'F');
    doc.setFillColor(31, 41, 222);
    doc.rect(15, curY, 2, boxHeight, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text("Como solicitar corretamente", 21, curY + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(splitComo, 21, curY + 12);
    curY += boxHeight + 10;

    checkPage(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("Disponibilidade Comercial", 15, curY);
    curY += 6;

    let ufX = 15;
    UFS.forEach(u => {
      const on = ufs.includes(u);
      if (on) {
        doc.setFillColor(31, 41, 222);
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setFillColor(241, 245, 249);
        doc.setTextColor(148, 163, 184);
      }
      doc.roundedRect(ufX, curY, 12, 7, 1, 1, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(u, ufX + 3, curY + 5);
      ufX += 15;
    });

    curY += 15;
    checkPage(10);
    doc.setDrawColor(226, 232, 240);
    doc.line(15, curY, 195, curY);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Arthromed Material Médico  ·  Central Comercial (81) 98923-6136", 15, curY + 5);

    doc.save(`Ficha_Tecnica_${p.n.replace(/\s+/g, '_')}.pdf`);
  };

  const currentSpec = getSpec(selectedProduct?.e);
  const currentUFs = INITIAL_UF[selectedProduct?.id] || [];

  const renderCard = (p) => {
    const spec = getSpec(p.e);
    const imgSrc = getImg(p);
    const badges = p.b || [];
    const uf = INITIAL_UF[p.id];
    
    return (
      <div key={p.id} className="card" style={{ '--c': spec ? spec.c : 'var(--azul)' }} onClick={() => setSelectedProduct(p)}>
        <div className="thumb">
          <span className="mark wm">
            <svg width="88" height="88" viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ opacity: 0.07 }}>
              <linearGradient id="wmBrand" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse"><stop stopColor="#1f29de"/><stop offset=".55" stopColor="#0e8fb8"/><stop offset="1" stopColor="#06df82"/></linearGradient>
              <path d="M30 8c2-2 6-1 7 2l16 40c1 3-1 6-4 6-2 0-4-1-5-3L34 24 24 49c-1 2-3 3-5 3-3 0-5-3-4-6L30 8Z" fill="url(#wmBrand)"/>
            </svg>
          </span>
          {imgSrc ? (
            <img className="ph-img" src={imgSrc} alt={p.n} loading="lazy" />
          ) : (
            <span className="type">{p.t}</span>
          )}
          {badges.length > 0 && (
            <span className="badges">
              {badges.map(b => (
                <span key={b} className={`pill ${badgeMeta[b]?.cls}`}>{badgeMeta[b]?.l}</span>
              ))}
            </span>
          )}
        </div>
        <div className="cbody">
          <span className="spec-line">{spec ? spec.nome : ''}</span>
          <h3>{p.n}</h3>
          <p className="tag">{p.tag}</p>
          
          {uf && uf.length > 0 ? (
            <div className="uf-row">
              {uf.map(u => (
                <span key={u} className={`uf-chip ${activeUf === u ? 'hit' : ''}`}>{u}</span>
              ))}
            </div>
          ) : (
            <div className="uf-row">
              <span className="uf-chip muted">Disponibilidade a confirmar</span>
            </div>
          )}

          <div className="foot">
            <span className="brand-l">{p.m !== '—' ? p.m : 'Curadoria Arthromed'}</span>
            <span className="add" dangerouslySetInnerHTML={{ __html: `Ver ficha ${ICN.arrow}` }}></span>
          </div>
        </div>
      </div>
    );
  };

  const renderSpecBlock = (s) => {
    if (!s) return null;
    const count = products.filter(p => p.e === s.id).length;
    
    return (
      <div key={s.id} className="spec-open section" id={s.id} data-c style={{ '--c': s.c }}>
        <div className="spine"></div>
        <div className="body">
          <div className="tagrow">
            <span className="spec-tag">{s.label}</span>
            <span className="brand-l mono" style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
              {count} {count === 1 ? 'produto' : 'produtos'}
            </span>
          </div>
          <h2>{s.nome}</h2>
          <p className="lead">{s.lead}</p>
          <div className="meta-grid">
            <div className="meta-card">
              <div className="h">Tecnologias</div>
              <ul>{s.tec.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div className="meta-card">
              <div className="h">Patologias tratadas</div>
              <ul>{s.pat.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div className="meta-card">
              <div className="h">Procedimentos</div>
              <ul>{s.proc.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div className="meta-card">
              <div className="h">Diferenciais</div>
              <ul>{s.dif.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCatalogContent = () => {
    const isFilterActive = search || activeType || activeBadge || activeUf;

    if (isFilterActive) {
      return (
        <div className="grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(p => renderCard(p))
          ) : (
            <div className="empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
              <b>Nenhum produto encontrado</b>
              Ajuste a busca ou os filtros — ou fale com um especialista pelo WhatsApp.
            </div>
          )}
        </div>
      );
    }

    if (activeSpec !== "") {
      const s = getSpec(activeSpec);
      return (
        <>
          {renderSpecBlock(s)}
          <div className="grid" style={{ marginTop: '18px' }}>
            {filteredProducts.map(p => renderCard(p))}
          </div>
        </>
      );
    }

    // Visão Geral: Cada especialidade com abertura + grade
    return SPECS.map(s => {
      const items = filteredProducts.filter(p => p.e === s.id);
      if (items.length === 0) return null;
      return (
        <div key={s.id} style={{ marginBottom: '40px' }}>
          {renderSpecBlock(s)}
          <div className="grid" style={{ margin: '18px 0 8px' }}>
            {items.map(p => renderCard(p))}
          </div>
        </div>
      );
    });
  };

  return (
    <>
      <header>
        <div className="bar">
          <button className="menu-toggle" aria-label="Abrir menu de especialidades" onClick={() => setRailOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
          <a className="brand" href="#top" aria-label="Arthromed — início">
            <span className="mark" id="logoMark">
              <svg width="34" height="34" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <defs><linearGradient id="agBrand" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse"><stop stopColor="#1f29de"/><stop offset=".55" stopColor="#0e8fb8"/><stop offset="1" stopColor="#06df82"/></linearGradient></defs>
                <path d="M30 8c2-2 6-1 7 2l16 40c1 3-1 6-4 6-2 0-4-1-5-3L34 24 24 49c-1 2-3 3-5 3-3 0-5-3-4-6L30 8Z" fill="url(#agBrand)"/>
                <path d="M22 33c1-3 5-4 8-2 2 2 3 5 1 8-2 4-7 5-11 4-3-1-4-4-2-7l4-3Z" fill="url(#agBrand)"/>
                <path d="M36 36c4-2 9-1 11 3 1 3-1 6-5 7-5 1-11-1-13-5-1-3 1-5 3-5l4 0Z" fill="url(#agBrand)"/>
              </svg>
            </span>
            <span>
              <span className="name">Arthromed</span>
              <span className="sub">Material Médico</span>
            </span>
          </a>
          <div className="search">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input 
              id="search" 
              type="search" 
              placeholder="Buscar produto, fabricante ou procedimento…" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off" 
            />
            <kbd>/</kbd>
          </div>
          <div className="actions">
            {isAdmin ? (
              <button className="btn btn-grad" onClick={() => setIsModalOpen(true)}>
                + Adicionar Produto
              </button>
            ) : (
              <a className="btn btn-ghost" href="/login">
                Painel
              </a>
            )}
            <a className="btn btn-ghost" href="https://wa.me/5581989236136" target="_blank" rel="noopener noreferrer">
              <span className="lbl">Contato</span>
            </a>
          </div>
        </div>
      </header>

      <div className="shell" id="top">
        <aside className={`rail ${railOpen ? 'show' : ''}`} id="rail">
          <div className="eyebrow">Especialidades</div>
          <nav id="specNav">
            <button className={`nav-item ${activeSpec === '' ? 'active' : ''}`} onClick={() => {setActiveSpec(''); setRailOpen(false)}}>
              <span className="dot" style={{background: 'var(--grafite)'}}></span>
              Todos os produtos
              <span className="count">{products.length}</span>
            </button>
            {SPECS.map(s => {
              const count = products.filter(p => p.e === s.id).length;
              return (
                <button key={s.id} className={`nav-item ${activeSpec === s.id ? 'active' : ''}`} onClick={() => {setActiveSpec(s.id); setRailOpen(false)}}>
                  <span className="dot" style={{background: s.c}}></span>
                  {s.nome}
                  <span className="count">{count}</span>
                </button>
              )
            })}
          </nav>
          
          <div className="eyebrow">Tipo de produto</div>
          <div className="chips">
            {TYPES.map(t => (
              <button key={t} className={`filter-chip ${activeType === t ? 'on' : ''}`} onClick={() => setActiveType(activeType === t ? '' : t)}>
                {t}
              </button>
            ))}
          </div>

          <div className="eyebrow">Disponível no estado</div>
          <div className="chips">
            {UFS.map(u => (
              <button key={u} className={`filter-chip ${activeUf === u ? 'on' : ''}`} onClick={() => setActiveUf(activeUf === u ? '' : u)}>
                {u}
              </button>
            ))}
          </div>
          
          <div className="eyebrow">Atalhos comerciais</div>
          <div className="chips">
             {BADGES.map(b => (
              <button key={b.k} className={`filter-chip ${activeBadge === b.k ? 'on' : ''}`} onClick={() => setActiveBadge(activeBadge === b.k ? '' : b.k)}>
                {b.l}
              </button>
            ))}
          </div>
        </aside>

        <main className="main">
          <section className="hero">
            <div className="hero-in">
              <span className="kicker">Portfólio de produtos · OPME & tecnologias cirúrgicas</span>
              <h1>Tecnologia e <b>confiança</b> em material médico.</h1>
              <p>Um portfólio completo, organizado e tecnicamente superior — do trauma à reconstrução bucomaxilar — com curadoria de fabricantes globais e suporte técnico especializado para o centro cirúrgico.</p>
              <div className="cta-row">
                <button className="btn btn-light" onClick={() => document.getElementById('catalog').scrollIntoView({behavior:'smooth'})}>Explorar portfólio</button>
                <a className="btn btn-ghost" href="https://wa.me/5581989236136" target="_blank" rel="noopener noreferrer">Falar com a Arthromed</a>
              </div>
            </div>
          </section>

          {/* Seção Stats */}
          <section className="stats" id="statsBand">
            <div className="stat">
              <div className="n">{SPECS.length}</div>
              <div className="l">Especialidades</div>
            </div>
            <div className="stat">
              <div className="n">{products.length}</div>
              <div className="l">Produtos & soluções</div>
            </div>
            <div className="stat">
              <div className="n">{new Set(products.map(p => p.m).filter(m => m && m !== '—')).size}+</div>
              <div className="l">Fabricantes globais</div>
            </div>
            <div className="stat">
              <div className="n">3</div>
              <div className="l">Estados atendidos</div>
            </div>
          </section>

          <div id="catalog">
            {renderCatalogContent()}
          </div>
        </main>
      </div>

      {(railOpen || selectedProduct) && <div className="scrim show" onClick={() => {setRailOpen(false); setSelectedProduct(null)}}></div>}

      {/* DRAWER DA FICHA DE PRODUTO COMPLETA */}
      <aside className={`drawer ${selectedProduct ? 'show' : ''}`} id="pfDrawer">
        <div className="dhead">
          <strong style={{fontSize:'13px',letterSpacing:'.04em',color:'var(--ink-2)',textTransform:'uppercase',fontWeight:800}}>Ficha técnica</strong>
          <button className="x" aria-label="Fechar" onClick={() => setSelectedProduct(null)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="dbody">
          {selectedProduct && (
            <>
              <div className="pf-hero" style={{ '--c': currentSpec?.c || 'var(--azul)' }}>
                {getImg(selectedProduct) && (
                  <img id="pfMainImg" src={getImg(selectedProduct)} alt={selectedProduct.n} />
                )}
                <span className="spec-tag" style={{ '--c': currentSpec?.c }}>{currentSpec?.label}</span>
                {selectedProduct.b && selectedProduct.b.map(b => (
                  <span key={b} className={`pill ${badgeMeta[b]?.cls}`}>{badgeMeta[b]?.l}</span>
                ))}
              </div>
              
              <div className="pf-wrap" style={{ '--c': currentSpec?.c }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="spec-line">{currentSpec?.nome}</span>
                  {isAdmin && (
                    <button 
                      onClick={() => openEditModal(selectedProduct)}
                      style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Editar Produto
                    </button>
                  )}
                </div>
                <h2>{selectedProduct.n}</h2>
                <p className="tag">{selectedProduct.tag}</p>
                
                <div className="pf-id">
                  <div className="cell">
                    <div className="k">Fabricante</div>
                    <div className="v">{selectedProduct.m !== '—' ? selectedProduct.m : 'Curadoria Arthromed'}</div>
                  </div>
                  <div className="cell">
                    <div className="k">Categoria</div>
                    <div className="v">{selectedProduct.t}</div>
                  </div>
                  <div className="cell">
                    <div className="k">Material</div>
                    <div className="v">{selectedProduct.mat || 'Sob consulta'}</div>
                  </div>
                  <div className="cell">
                    <div className="k">Registro ANVISA</div>
                    <div className="v mono">Sob consulta</div>
                  </div>
                </div>

                {/* Como solicitar */}
                <div className="pf-callout">
                  <div className="cot">
                    <span dangerouslySetInnerHTML={{ __html: ICN.doc }}></span>
                    <span>Como solicitar corretamente</span>
                  </div>
                  <p>{selectedProduct.como || 'Defina aqui a forma correta de solicitação deste produto — código, embalagem, prazo de pedido e canal.'}</p>
                </div>

                {/* Disponibilidade */}
                <div className="pf-sec">
                  <h4>Disponibilidade comercial</h4>
                  <div className="uf-cover">
                    {UFS.map(u => {
                      const on = currentUFs.includes(u);
                      return <span key={u} className={`uf-cell ${on ? 'on' : 'off'}`}>{u}</span>;
                    })}
                  </div>
                  <p className="uf-note">
                    {currentUFs.length ? `Comercializável em ${currentUFs.length} ${currentUFs.length > 1 ? 'estados' : 'estado'}.` : 'Disponibilidade a confirmar com a central comercial.'}
                  </p>
                </div>

                {/* Descrição */}
                {selectedProduct.res && (
                  <div className="pf-sec">
                    <h4>Descrição</h4>
                    <p>{selectedProduct.res}</p>
                  </div>
                )}

                {/* Destaques */}
                {selectedProduct.d && selectedProduct.d.length > 0 && (
                  <div className="pf-sec">
                    <h4>Destaques</h4>
                    <ul className="pf-list">
                      {selectedProduct.d.map((x, i) => (
                        <li key={i}>
                          <span dangerouslySetInnerHTML={{ __html: ICN.check }}></span>
                          <span>{x}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Indicações */}
                {selectedProduct.ind && selectedProduct.ind.length > 0 && (
                  <div className="pf-sec">
                    <h4>Indicações</h4>
                    <ul className="pf-list">
                      {selectedProduct.ind.map((x, i) => (
                        <li key={i}>
                          <span dangerouslySetInnerHTML={{ __html: ICN.check }}></span>
                          <span>{x}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Aplicações */}
                {selectedProduct.apl && selectedProduct.apl.length > 0 && (
                  <div className="pf-sec">
                    <h4>Aplicações & procedimentos</h4>
                    <ul className="pf-list">
                      {selectedProduct.apl.map((x, i) => (
                        <li key={i}>
                          <span dangerouslySetInnerHTML={{ __html: ICN.check }}></span>
                          <span>{x}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Diferenciais */}
                {selectedProduct.dif && selectedProduct.dif.length > 0 && (
                  <div className="pf-sec">
                    <h4>Diferenciais competitivos</h4>
                    <ul className="pf-list">
                      {selectedProduct.dif.map((x, i) => (
                        <li key={i}>
                          <span dangerouslySetInnerHTML={{ __html: ICN.check }}></span>
                          <span>{x}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Códigos */}
                {selectedProduct.cod && selectedProduct.cod.length > 0 && (
                  <div className="pf-sec">
                    <h4>Códigos & apresentação</h4>
                    <div className="code-grid">
                      {selectedProduct.cod.map(([c, d]) => (
                        <div className="code-chip" key={c}>
                          <div className="c mono">{c}</div>
                          <div className="d">{d}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pf-actions">
                <button className="btn btn-grad" style={{ flex: 1 }} onClick={() => copyResumo(selectedProduct)}>
                  <span dangerouslySetInnerHTML={{ __html: ICN.copy }}></span> Copiar resumo
                </button>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => downloadProductPDF(selectedProduct)}>
                  Baixar PDF
                </button>
                <button className="btn btn-ghost" style={{ padding: '10px' }} onClick={() => shareProduct(selectedProduct)}>
                  <span dangerouslySetInnerHTML={{ __html: ICN.share }}></span>
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* MODAL DE ADICIONAR PRODUTO (Somente Admin) */}
      {isAdmin && isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: '20px' }}>
          <div style={{ background: 'var(--surface)', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Adicionar Novo Produto</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ fontSize: '24px', cursor: 'pointer', color: 'var(--ink-2)' }}>&times;</button>
            </div>

            {success && (
              <div style={{ background: '#dcfce7', color: '#166534', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontWeight: 600 }}>
                {success}
              </div>
            )}

            <form onSubmit={handleAddSubmit}>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Nome do Produto</label>
                  <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Marca</label>
                  <input required type="text" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Especialidade</label>
                  <select value={formData.especialidade} onChange={e => setFormData({...formData, especialidade: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }}>
                    {SPECS.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Tipo</label>
                  <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Breve Descrição</label>
                <input type="text" value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Disponibilidade (Estados)</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {UFS.map(uf => (
                    <button key={uf} type="button" onClick={() => toggleUF(uf)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid', borderColor: formData.estados.includes(uf) ? 'var(--azul)' : 'var(--line)', background: formData.estados.includes(uf) ? '#eff6ff' : '#fff', color: formData.estados.includes(uf) ? 'var(--azul)' : '#333' }}>
                      {uf}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Foto do Produto (Câmera ou Arquivo)</label>
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ width: '100%', padding: '10px', border: '1px dashed var(--azul)', borderRadius: '8px' }} />
              </div>

              <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: 'var(--grad)', color: '#fff', borderRadius: '8px', fontWeight: 800, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Salvando...' : 'Adicionar ao Portfólio'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDITAR PRODUTO (Somente Admin) */}
      {isAdmin && editingProduct && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: '20px' }}>
          <div style={{ background: 'var(--surface)', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Editar Produto: {editingProduct.n}</h2>
              <button onClick={() => setEditingProduct(null)} style={{ fontSize: '24px', cursor: 'pointer', color: 'var(--ink-2)' }}>&times;</button>
            </div>

            {success && (
              <div style={{ background: '#dcfce7', color: '#166534', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontWeight: 600 }}>
                {success}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Nome do Produto</label>
                  <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Marca</label>
                  <input required type="text" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Especialidade</label>
                  <select value={formData.especialidade} onChange={e => setFormData({...formData, especialidade: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }}>
                    {SPECS.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Tipo</label>
                  <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Breve Descrição</label>
                <input type="text" value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Disponibilidade (Estados)</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {UFS.map(uf => (
                    <button key={uf} type="button" onClick={() => toggleUF(uf)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid', borderColor: formData.estados.includes(uf) ? 'var(--azul)' : 'var(--line)', background: formData.estados.includes(uf) ? '#eff6ff' : '#fff', color: formData.estados.includes(uf) ? 'var(--azul)' : '#333' }}>
                      {uf}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Nova Foto do Produto (Deixe em branco para manter a atual)</label>
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ width: '100%', padding: '10px', border: '1px dashed var(--azul)', borderRadius: '8px' }} />
              </div>

              <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: 'var(--grad)', color: '#fff', borderRadius: '8px', fontWeight: 800, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
