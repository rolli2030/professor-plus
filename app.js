// ------------------------------
// Estado & seed
// ------------------------------
const KEY = "professor_plus_v1";

const seed = {
  usuario: { nome: "Prof. Gilson" },
  turmas: [
    { id: "t1", nome: "Matemática", serie: "2ª série", turno: "Manhã" },
    { id: "t2", nome: "História", serie: "1ª série", turno: "Tarde" },
    { id: "t3", nome: "Geografia", serie: "3ª série", turno: "Noite" },
    { id: "t4", nome: "Português", serie: "4ª série", turno: "Manhã" }
  ],
  alunos: {
    t1: [
      "Ana Lima","Bruno Almeida","Carla Andrade","Daniel Melo","Fernanda Souza"
    ],
    t2: ["Alice Souza","Bruno Almeida","Carla Ferreira","Diego Martins","Ester Rodrigues"],
    t3: ["Rafa Santos","Marina Souza","Caio Lima"],
    t4: ["Paula Seixas","Gustavo Reis"]
  },
  atividades: {
    t1: [
      { id:"a1", titulo:"Prova de Geometria", data:"2024-04-20" },
      { id:"a2", titulo:"Trabalho: História da Matemática", data:"2024-04-10" },
      { id:"a3", titulo:"Avaliação Bimestral", data:"2024-04-05" }
    ]
  },
  notas: { // { turmaId: { atividadeId: { aluno:nota } } }
    t1: { }
  },
  chamada: { // { turmaId: { ISODate: { aluno: "presente|falta|justi" } } }
    t1: {}
  }
};

function loadState(){
  const raw = localStorage.getItem(KEY);
  if(!raw){
    localStorage.setItem(KEY, JSON.stringify(seed));
    return JSON.parse(JSON.stringify(seed));
  }
  try { return JSON.parse(raw); } catch { return JSON.parse(JSON.stringify(seed)); }
}
function saveState(){ localStorage.setItem(KEY, JSON.stringify(state)); }
let state = loadState();

// ------------------------------
// Util
// ------------------------------
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
function fmtTurma(t){ return `${t.nome} – ${t.serie} • ${t.turno}`; }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function byId(arr, id){ return arr.find(x => x.id === id); }

// ------------------------------
// Login / App toggling
// ------------------------------
const loginScreen = $("#login-screen");
const appEl = $("#app");
const content = $("#content");
const sidebar = $("#sidebar");
$("#btnHamburger").onclick = () => sidebar.classList.toggle("open");

$("#btnLoginGoogle").onclick = fakeLogin;
$("#btnLoginEmail").onclick = fakeLogin;
$("#btnSair").onclick = () => {
  location.hash = "";
  loginScreen.classList.remove("hidden");
  appEl.classList.add("hidden");
};
function fakeLogin(){
  loginScreen.classList.add("hidden");
  appEl.classList.remove("hidden");
  if(!location.hash) location.hash = "#/dashboard";
}

// ------------------------------
// Router
// ------------------------------
const routes = {
  "/dashboard": renderDashboard,
  "/turmas": renderTurmas,
  "/turma": params => renderDetalheTurma(params.id),
  "/atividades": renderAtividadesGlobais,
  "/lancar": params => renderLancarNotas(params.turma, params.atividade),
  "/relatorios": renderRelatorios,
  "/estatisticas": renderEstatisticas,
  "/perfil": renderPerfil,
  "/config": renderConfig,
  "/chamada": () => {
    // atalho: chama detalhe da primeira turma para chamada
    const t = state.turmas[0]; renderDetalheTurma(t.id, "chamada");
  }
};

window.addEventListener("hashchange", handleRoute);
function parseHash(){
  const [path, query] = location.hash.replace("#","").split("?");
  const params = Object.fromEntries(new URLSearchParams(query||"").entries());
  return { path, params };
}
function handleRoute(){
  const { path, params } = parseHash();
  const fn = routes[path] || renderDashboard;
  fn(params || {});
  highlightNav(path);
}
function highlightNav(path){
  $$("[data-route]").forEach(a=>{
    a.classList.toggle("active", a.getAttribute("href") === `#${path}`);
  });
}
if(location.hash){ handleRoute(); }

// ------------------------------
// Render: Dashboard
// ------------------------------
function renderDashboard(){
  const tpl = $("#tpl-dashboard").content.cloneNode(true);
  $("#content").innerHTML = "";
  content.appendChild(tpl);

  $("#kpiTurmas").textContent = state.turmas.length;
  const totalAlunos = Object.values(state.alunos).reduce((acc,arr)=>acc+arr.length,0);
  $("#kpiAlunos").textContent = totalAlunos;
  // Atividades hoje (mock por data igual a hoje)
  const hoje = todayISO();
  let hojeCount = 0;
  Object.values(state.atividades).forEach(list=>{
    list.forEach(a=>{ if(a.data===hoje) hojeCount++; });
  });
  $("#kpiAtividadesHoje").textContent = hojeCount;
}

// ------------------------------
// Render: Turmas
// ------------------------------
function renderTurmas(){
  const tpl = $("#tpl-turmas").content.cloneNode(true);
  content.innerHTML = ""; content.appendChild(tpl);

  const list = $("#listaTurmas");
  list.innerHTML = "";
  state.turmas.forEach(t=>{
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div>
        <div class="row-title">${t.nome}</div>
        <div class="row-sub">${t.serie} • ${t.turno}</div>
      </div>
      <div class="row-actions">
        <a class="action" title="Ver" href="#/turma?id=${t.id}">👁️</a>
        <button class="action" title="Editar">✏️</button>
        <button class="action" title="Mais">📋</button>
      </div>
    `;
    list.appendChild(row);
  });
}

// ------------------------------
// Render: Detalhe Turma (Alunos / Atividades / Chamada)
// ------------------------------
function renderDetalheTurma(turmaId, initialTab="alunos"){
  const turma = byId(state.turmas, turmaId) || state.turmas[0];
  const tpl = $("#tpl-detalhe-turma").content.cloneNode(true);
  content.innerHTML = ""; content.appendChild(tpl);

  $("#nomeUsuarioTop").textContent = state.usuario.nome || "Gilson";
  $("#tituloTurma").textContent = `${turma.nome} – ${turma.serie} – ${turma.turno}`;

  // Tabs
  $$(".tab").forEach(btn=>{
    btn.onclick = ()=>{
      $$(".tab").forEach(b=>b.classList.remove("active"));
      $$(".tabpane").forEach(p=>p.classList.remove("active"));
      btn.classList.add("active");
      $(`#pane${btn.dataset.tab.charAt(0).toUpperCase()+btn.dataset.tab.slice(1)}`).classList.add("active");
    };
  });
  if(initialTab!=="alunos"){ $(`.tab[data-tab="${initialTab}"]`).click(); }

  // Alunos
  const alunos = state.alunos[turma.id] || [];
  const listaAlunos = $("#listaAlunos");
  listaAlunos.innerHTML = "";
  alunos.forEach(nome=>{
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<div class="row-title">${nome}</div>`;
    listaAlunos.appendChild(row);
  });
  $("#btnNovoAluno").onclick = ()=>{
    const nome = prompt("Nome do novo aluno:");
    if(nome){
      state.alunos[turma.id] = state.alunos[turma.id] || [];
      state.alunos[turma.id].push(nome);
      saveState(); renderDetalheTurma(turma.id,"alunos");
    }
  };

  // Atividades
  const listaAtv = $("#listaAtividades");
  const atividades = (state.atividades[turma.id] || []).slice().sort((a,b)=> (a.data<b.data?1:-1));
  listaAtv.innerHTML = "";
  atividades.forEach(a=>{
    const r = document.createElement("div");
    r.className = "row";
    const dt = new Date(a.data);
    r.innerHTML = `
      <div>
        <div class="row-title">${a.titulo}</div>
        <div class="row-sub">${dt.toLocaleDateString()}</div>
      </div>
      <div class="row-actions">
        <a class="btn btn-primary" href="#/lancar?turma=${turma.id}&atividade=${a.id}">Lançar Notas</a>
      </div>
    `;
    listaAtv.appendChild(r);
  });
  $("#btnNovaAtividade").onclick = ()=>{
    const titulo = prompt("Título da atividade:");
    if(!titulo) return;
    const data = prompt("Data (AAAA-MM-DD):", todayISO());
    state.atividades[turma.id] = state.atividades[turma.id] || [];
    state.atividades[turma.id].push({ id: crypto.randomUUID(), titulo, data });
    saveState(); renderDetalheTurma(turma.id,"atividades");
  };

  // Chamada
  $("#chamadaData").textContent = new Date().toLocaleDateString();
  const listaChamada = $("#listaChamada");
  listaChamada.innerHTML = "";
  const dataKey = todayISO();
  const reg = (((state.chamada||{})[turma.id]||{})[dataKey]) || {};

  alunos.forEach(nome=>{
    const row = document.createElement("div");
    row.className = "chamada-row";
    row.innerHTML = `
      <div>${nome}</div>
      <button class="btn-pill" data-val="presente">Presente</button>
      <button class="btn-pill" data-val="falta">Falta</button>
      <button class="btn-pill" data-val="justi">Justi.</button>
    `;
    const [bP,bF,bJ] = row.querySelectorAll(".btn-pill");
    const apply = (val)=>{
      [bP,bF,bJ].forEach(b=>b.classList.remove("active"));
      if(val==="presente") bP.classList.add("active");
      if(val==="falta") bF.classList.add("active");
      if(val==="justi") bJ.classList.add("active");
      reg[nome]=val;
    };
    [bP,bF,bJ].forEach(b=> b.onclick = ()=> apply(b.dataset.val));
    if(reg[nome]) apply(reg[nome]);
    listaChamada.appendChild(row);
  });

  $("#btnSalvarChamada").onclick = ()=>{
    state.chamada[turma.id] = state.chamada[turma.id] || {};
    state.chamada[turma.id][dataKey] = reg;
    saveState();
    alert("Chamada salva!");
  };
}

// ------------------------------
// Render: Lançar Notas
// ------------------------------
function renderLancarNotas(turmaId, atividadeId){
  const turma = byId(state.turmas, turmaId);
  if(!turma){ location.hash = "#/turmas"; return; }
  const atividade = (state.atividades[turmaId]||[]).find(a=>a.id===atividadeId);
  const tpl = $("#tpl-lancar-notas").content.cloneNode(true);
  content.innerHTML = ""; content.appendChild(tpl);

  $("#lancarUser").textContent = state.usuario.nome || "Gilson";
  $("#contextoLancar").textContent = `${atividade?.titulo || "Atividade"} – ${fmtTurma(turma)}`;

  const alunos = state.alunos[turmaId] || [];
  const notasTurma = (state.notas[turmaId] = state.notas[turmaId] || {});
  const notasAtividade = (notasTurma[atividadeId] = notasTurma[atividadeId] || {});
  const list = $("#listaLancar"); list.innerHTML = "";

  alunos.forEach(nome=>{
    const row = document.createElement("div");
    row.className = "grade-row";
    const valor = notasAtividade[nome] ?? "";
    row.innerHTML = `
      <div>${nome}</div>
      <input class="note-input" type="number" min="0" max="10" step="0.1" value="${valor}" />
      <span class="comment-ico" title="Observação">💬</span>
    `;
    const inp = row.querySelector("input");
    inp.onchange = ()=> notasAtividade[nome] = Number(inp.value);
    list.appendChild(row);
  });

  $("#btnSalvarNotas").onclick = ()=>{
    saveState();
    alert("Notas salvas!");
    location.hash = `#/turma?id=${turmaId}`;
  };
}

// ------------------------------
// Render: Atividades (globais)
—------------------------------
function renderAtividadesGlobais(){
  const tpl = $("#tpl-atividades").content.cloneNode(true);
  content.innerHTML = ""; content.appendChild(tpl);

  const cont = $("#atividadesGlobais");
  cont.innerHTML = "";
  state.turmas.forEach(t=>{
    (state.atividades[t.id]||[]).forEach(a=>{
      const r = document.createElement("div");
      r.className="row";
      const dt = new Date(a.data).toLocaleDateString();
      r.innerHTML = `
        <div>
          <div class="row-title">${a.titulo}</div>
          <div class="row-sub">${fmtTurma(t)} — ${dt}</div>
        </div>
        <div class="row-actions">
          <a class="btn btn-primary" href="#/lancar?turma=${t.id}&atividade=${a.id}">Lançar Notas</a>
        </div>
      `;
      cont.appendChild(r);
    });
  });
}

// ------------------------------
// Render: Relatórios (gráficos)
// ------------------------------
let chartPresenca, chartMedias;

function renderRelatorios(){
  const tpl = $("#tpl-relatorios").content.cloneNode(true);
  content.innerHTML = ""; content.appendChild(tpl);

  // Filtros
  const selTurma = $("#filtroTurma");
  selTurma.innerHTML = `<option value="todas">Todas as turmas</option>` +
    state.turmas.map(t=> `<option value="${t.id}">${t.nome}</option>`).join("");

  $("#btnExportPDF").onclick = ()=> window.print();
  $("#btnExportExcel").onclick = exportCSV;

  drawCharts();
}

function drawCharts(){
  // Data de presença por turma = % de presentes no dia atual (mock via registros)
  const labels = state.turmas.map(t=> t.nome.charAt(0));
  const dataPresenca = state.turmas.map(t=>{
    const alunos = state.alunos[t.id]||[];
    const reg = (((state.chamada||{})[t.id]||{})[todayISO()])||{};
    const presentes = Object.values(reg).filter(v=>v==="presente").length;
    return alunos.length ? Math.round((presentes/alunos.length)*100) : 0;
  });

  if(chartPresenca){ chartPresenca.destroy(); }
  chartPresenca = new ApexCharts(document.querySelector("#chartPresenca"), {
    chart:{ type:"bar", height:280 },
    series:[{ name:"Presença (%)", data: dataPresenca }],
    xaxis:{ categories: labels },
    grid:{ borderColor:"#eee" }
  });
  chartPresenca.render();

  // Média das notas (faixas)
  const faixas = { abaixo:0, media:0, acima:0, excelente:0 };
  Object.entries(state.notas).forEach(([turmaId, porAtividade])=>{
    Object.values(porAtividade).forEach(map=>{
      Object.values(map).forEach(n=>{
        if(n < 5) faixas.abaixo++;
        else if(n < 7) faixas.media++;
        else if(n < 9) faixas.acima++;
        else faixas.excelente++;
      });
    });
  });
  const pieData = [faixas.abaixo, faixas.acima, faixas.media, faixas.excelente];

  if(chartMedias){ chartMedias.destroy(); }
  chartMedias = new ApexCharts(document.querySelector("#chartMedias"), {
    chart:{ type:"pie", height:280 },
    series: pieData,
    labels: ["Abaixo da média","Acima da média","Média","Excelente"]
  });
  chartMedias.render();
}

function exportCSV(){
  // Exporta um resumo simples de presença e notas
  let csv = "Seção;Item;Valor\n";
  state.turmas.forEach(t=>{
    const alunos = state.alunos[t.id]||[];
    csv += `Turma;${fmtTurma(t)};Alunos ${alunos.length}\n`;
  });
  csv += "\nNotas (turma/atividade/aluno/nota)\n";
  Object.entries(state.notas).forEach(([tid, porAtv])=>{
    Object.entries(porAtv).forEach(([aid,map])=>{
      Object.entries(map).forEach(([aluno,nota])=>{
        const turma = byId(state.turmas, tid);
        const atv = (state.atividades[tid]||[]).find(a=>a.id===aid);
        csv += `${fmtTurma(turma)};${atv?.titulo};${aluno};${nota}\n`;
      });
    });
  });

  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "relatorio_professor+.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

// ------------------------------
// Render: Estatísticas / Perfil / Config
// ------------------------------
function renderEstatisticas(){
  const tpl = $("#tpl-estatisticas").content.cloneNode(true);
  content.innerHTML = ""; content.appendChild(tpl);
}
function renderPerfil(){
  const tpl = $("#tpl-perfil").content.cloneNode(true);
  content.innerHTML = ""; content.appendChild(tpl);
  const inp = $("#inpNome"); inp.value = state.usuario.nome || "Prof. Gilson";
  $("#btnSalvarPerfil").onclick = ()=>{
    state.usuario.nome = inp.value || "Prof. Gilson";
    saveState(); alert("Perfil salvo!");
  };
}
function renderConfig(){
  const tpl = $("#tpl-config").content.cloneNode(true);
  content.innerHTML = ""; content.appendChild(tpl);
  $("#btnReset").onclick = ()=>{
    localStorage.removeItem(KEY);
    state = loadState();
    alert("Dados limpos.");
    location.hash = "#/dashboard";
  };
}

// Start on login (mock)
if(!location.hash){ /* mostra login */ } else { fakeLogin(); handleRoute(); }
