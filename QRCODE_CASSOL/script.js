/* ════════════════════════════════════════════════════════════════
   QR STUDIO — script.js
   Organização:
     1. Referências ao DOM
     2. Atalho de teclado (Enter)
     3. Toast (notificação)
     4. Geração dos QR Codes (função principal)
     5. Criação de cada card
     6. Geração do canvas final (QR + legenda) — compartilhado
     7. Download do QR Code como PNG
     8. Download do QR Code como PDF
     9. Download de todos como ZIP de PDFs
    10. Limpar tudo
    11. Utilitários
════════════════════════════════════════════════════════════════ */


/* ════════════════════════════════════════════════════════════════
   1. REFERÊNCIAS AO DOM
   Captura os elementos HTML que serão manipulados pelo JS.
   Feito uma única vez aqui para evitar document.getElementById
   espalhado pelo código.
════════════════════════════════════════════════════════════════ */
const inputEl  = document.getElementById('qrInput');     // campo de conteúdo do QR
const legendEl = document.getElementById('legendInput'); // campo de legenda (opcional)
const gridEl   = document.getElementById('qrGrid');      // container dos cards
const emptyEl  = document.getElementById('emptyState');  // tela vazia
const barEl    = document.getElementById('controlsBar'); // barra de controles
const badgeEl  = document.getElementById('countBadge'); // badge com contagem
const toastEl  = document.getElementById('toast');      // notificação flutuante

// Timer para esconder o toast automaticamente após alguns segundos
let toastTimer = null;


/* ════════════════════════════════════════════════════════════════
   2. ATALHO DE TECLADO
   Pressionar Enter em qualquer campo dispara a geração dos QR Codes
════════════════════════════════════════════════════════════════ */
inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') generate();
});

legendEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') generate();
});


/* ════════════════════════════════════════════════════════════════
   3. TOAST (NOTIFICAÇÃO)
   Exibe uma mensagem temporária no rodapé da tela.
   A classe .show é adicionada para tornar o toast visível
   (via transição CSS) e removida após 2,2 segundos.
════════════════════════════════════════════════════════════════ */
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');

  // Cancela qualquer timer anterior para evitar que o toast
  // desapareça cedo demais se chamado várias vezes seguidas
  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2200);
}


/* ════════════════════════════════════════════════════════════════
   4. GERAÇÃO DOS QR CODES (função principal)
  Lê os dois campos, divide pelo separador "&&", e cria um card
   para cada item. A legenda é opcional e pode ter menos entradas
   do que o conteúdo — nesse caso, só os primeiros recebem legenda.
════════════════════════════════════════════════════════════════ */
function generate() {

  // Lê e limpa espaços das extremidades de ambos os campos
  const rawContent = inputEl.value.trim();
  const rawLegend  = legendEl.value.trim();

  // Valida que ao menos o campo de conteúdo foi preenchido
  if (!rawContent) {
    showToast('✦ Digite o conteúdo do QR Code primeiro');
    return;
  }

  // Divide o conteúdo pelo separador "&&" e remove entradas vazias
  const contentItems = rawContent
    .split('&&')
    .map(s => s.trim())
    .filter(Boolean);

  if (!contentItems.length) {
    showToast('✦ Texto inválido');
    return;
  }

  // Divide as legendas pelo mesmo separador "&&"
  const legendItems = rawLegend
    ? rawLegend.split('&&').map(s => s.trim())
    : [];

  // Limpa os cards anteriores para gerar novos
  gridEl.innerHTML = '';

  // Exibe a barra de controles e esconde o estado vazio
  emptyEl.style.display = 'none';
  barEl.style.display   = 'flex';
  badgeEl.textContent   = contentItems.length;

  // Cria cada card com um pequeno delay escalonado para animação
  contentItems.forEach((text, index) => {
    const caption = legendItems[index] || '';
    setTimeout(() => {
      addCard(text, caption, index);
    }, index * 80);
  });

  // Feedback ao usuário
  const plural = contentItems.length > 1;
  showToast(`✓ ${contentItems.length} QR Code${plural ? 's' : ''} gerado${plural ? 's' : ''}!`);
}


/* ════════════════════════════════════════════════════════════════
   5. CRIAÇÃO DE CADA CARD
   Recebe o texto do QR, a legenda (pode ser vazia) e o índice.
   Constrói o HTML do card, injeta no grid e instancia o QRCode.

   Parâmetros:
     text    {string} — conteúdo que será codificado no QR
     caption {string} — legenda opcional (string vazia = sem legenda)
     index   {number} — posição do item (0-based)
════════════════════════════════════════════════════════════════ */
function addCard(text, caption, index) {

  // ID único para o container do QR Code.
  const id = 'qr-' + Date.now() + '-' + index;

  // Cria o elemento do card
  const card = document.createElement('div');
  card.className = 'qr-card';

  card.innerHTML = `
    <!-- Cabeçalho: índice e contagem de caracteres -->
    <div class="qr-card-header">
      <span class="qr-index">#${String(index + 1).padStart(2, '0')}</span>
      <span class="qr-len">${text.length} chars</span>
    </div>

    <!-- Área branca onde o QR Code será renderizado pela biblioteca -->
    <div class="qr-canvas-wrap" id="${id}"></div>

    ${caption
      ? `<div class="qr-caption-wrap">
           <p class="qr-caption">${escHtml(caption)}</p>
         </div>`
      : ''
    }

    <!-- Rodapé: preview do texto e botões de download -->
    <div class="qr-card-footer">
      <div class="qr-text-preview" title="${escHtml(text)}">${escHtml(text)}</div>

      <!-- Grupo de dois botões de download -->
      <div class="btn-download-group">

        <!-- Botão PNG -->
        <button class="btn-download btn-download--png"
                onclick="downloadQR('${id}', ${index})"
                data-caption="${escHtml(caption)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          PNG
        </button>

        <!-- Botão PDF -->
        <button class="btn-download btn-download--pdf"
                onclick="downloadQRasPDF('${id}', ${index})"
                data-caption="${escHtml(caption)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="8" y1="13" x2="16" y2="13"/>
            <line x1="8" y1="17" x2="16" y2="17"/>
          </svg>
          PDF
        </button>

      </div>
    </div>
  `;

  // Injeta o card no grid
  gridEl.appendChild(card);

  // Instancia a biblioteca QRCode no container identificado por `id`
  new QRCode(document.getElementById(id), {
    text:         text,
    width:        192,
    height:       192,
    colorDark:    '#000000',
    colorLight:   '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
}


/* ════════════════════════════════════════════════════════════════
   6. GERAÇÃO DO CANVAS FINAL (QR + LEGENDA)
   Função utilitária compartilhada entre download PNG e PDF.
   Retorna uma Promise que resolve com o canvas composto.

   Parâmetros:
     containerId {string} — id do elemento .qr-canvas-wrap
     caption     {string} — legenda (pode ser vazia)

   Retorna:
     Promise<HTMLCanvasElement> — canvas com QR + legenda renderizados
════════════════════════════════════════════════════════════════ */
function buildFinalCanvas(containerId, caption) {
  return new Promise((resolve, reject) => {
    const container = document.getElementById(containerId);

    // Obtém a imagem do QR (pode ser <img> ou <canvas> dependendo do browser)
    const qrImg    = container.querySelector('img');
    const qrCanvas = container.querySelector('canvas');

    let srcUrl = null;
    if (qrImg && qrImg.src)  srcUrl = qrImg.src;
    else if (qrCanvas)       srcUrl = qrCanvas.toDataURL('image/png');

    if (!srcUrl) {
      reject(new Error('Fonte do QR não encontrada'));
      return;
    }

    const image = new Image();
    image.onload = function () {
      const qrSize       = image.width;
      const padding      = 24;
      let captionHeight  = 0;
      const fontSize     = 42;

      if (caption) {
        captionHeight = fontSize + padding * 2;
      }

      const canvasW = qrSize + padding * 2;
      const canvasH = padding + qrSize + padding + captionHeight;

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width  = canvasW;
      finalCanvas.height = canvasH;

      const ctx = finalCanvas.getContext('2d');

      // Fundo branco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, canvasH);

      // QR Code centralizado
      ctx.drawImage(image, padding, padding, qrSize, qrSize);

      // Legenda abaixo do QR, se houver
      if (caption) {
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding + qrSize + padding / 2);
        ctx.lineTo(canvasW - padding, padding + qrSize + padding / 2);
        ctx.stroke();

        ctx.fillStyle    = '#000000';
        ctx.font         = `bold ${fontSize}px sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        const textY = padding + qrSize + padding + captionHeight / 2;
        ctx.fillText(caption, canvasW / 2, textY);
      }

      resolve(finalCanvas);
    };

    image.onerror = () => reject(new Error('Falha ao carregar imagem do QR'));
    image.src = srcUrl;
  });
}


/* ════════════════════════════════════════════════════════════════
   7. DOWNLOAD DO QR CODE COMO PNG
   Usa buildFinalCanvas para compor a imagem e a dispara como
   download de arquivo .png.

   Parâmetros:
     containerId {string} — id do elemento .qr-canvas-wrap
     index       {number} — índice do card (para nomear o arquivo)
════════════════════════════════════════════════════════════════ */
function downloadQR(containerId, index) {
  const container = document.getElementById(containerId);
  const btn       = container.closest('.qr-card').querySelector('.btn-download--png');
  const caption   = btn ? (btn.dataset.caption || '') : '';

  buildFinalCanvas(containerId, caption)
    .then(finalCanvas => {
      const url = finalCanvas.toDataURL('image/png');
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `qrcode-${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`✓ qrcode-${index + 1}.png baixado!`);
    })
    .catch(() => showToast('✦ Erro ao baixar PNG, tente novamente'));
}


/* ════════════════════════════════════════════════════════════════
   8. DOWNLOAD DO QR CODE COMO PDF
   Usa buildFinalCanvas para compor a imagem, depois cria um PDF
   com jsPDF com dimensões exatas do canvas (sem margens extras).

   Parâmetros:
     containerId {string} — id do elemento .qr-canvas-wrap
     index       {number} — índice do card (para nomear o arquivo)
════════════════════════════════════════════════════════════════ */
function downloadQRasPDF(containerId, index) {
  const container = document.getElementById(containerId);
  const btn       = container.closest('.qr-card').querySelector('.btn-download--pdf');
  const caption   = btn ? (btn.dataset.caption || '') : '';

  buildFinalCanvas(containerId, caption)
    .then(finalCanvas => {
      const imgData = finalCanvas.toDataURL('image/png');

      // Converte pixels → milímetros (96dpi padrão de canvas)
      const pxToMm  = px => px * 25.4 / 96;
      const widthMm  = pxToMm(finalCanvas.width);
      const heightMm = pxToMm(finalCanvas.height);

      // Cria PDF com página do tamanho exato do canvas
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: widthMm >= heightMm ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [widthMm, heightMm]
      });

      doc.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
      doc.save(`qrcode-${index + 1}.pdf`);

      showToast(`✓ qrcode-${index + 1}.pdf baixado!`);
    })
    .catch(() => showToast('✦ Erro ao gerar PDF, tente novamente'));
}


/* ════════════════════════════════════════════════════════════════
   9. DOWNLOAD DE TODOS OS QR CODES COMO ZIP DE PDFs
   Percorre todos os cards existentes, gera um PDF para cada um,
   compacta todos num arquivo .zip usando JSZip e dispara o download.

   Fluxo:
     1. Coleta todos os containers de QR do grid
     2. Para cada um, gera o canvas final e converte para PDF (blob)
     3. Adiciona cada PDF ao objeto JSZip
     4. Finaliza o ZIP e dispara o download
════════════════════════════════════════════════════════════════ */
async function downloadAll() {
  const cards = gridEl.querySelectorAll('.qr-card');

  if (!cards.length) {
    showToast('✦ Nenhum QR Code para baixar');
    return;
  }

  const btnAll = document.getElementById('btnDownloadAll');
  btnAll.disabled    = true;
  btnAll.textContent = '⏳ Gerando...';

  showToast(`⏳ Gerando ${cards.length} PDF${cards.length > 1 ? 's' : ''}...`);

  const zip = new JSZip();
  const { jsPDF } = window.jspdf;

  // Processa cada card de forma sequencial para não sobrecarregar a memória
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];

    // ── Passo 1: encontra o container do QR nesse card ──────
    const container = card.querySelector('[id^="qr-"]');
    if (!container) continue;

    // ── Passo 2: pega a legenda do botão PDF desse card ─────
    const btn     = card.querySelector('.btn-download--pdf');
    const caption = btn ? (btn.dataset.caption || '') : '';

    try {
      // ── Passo 3: gera o canvas composto para esse QR ──────
      const finalCanvas = await buildFinalCanvas(container.id, caption);
      const imgData     = finalCanvas.toDataURL('image/png');

      // Converte pixels → milímetros
      const pxToMm   = px => px * 25.4 / 96;
      const widthMm  = pxToMm(finalCanvas.width);
      const heightMm = pxToMm(finalCanvas.height);

      // ── Passo 4: gera PDF individual ──────────────────────
      const doc = new jsPDF({
        orientation: widthMm >= heightMm ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [widthMm, heightMm]
      });

      doc.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);

      // ── Passo 5: adiciona ao ZIP como ArrayBuffer ─────────
      // output('arraybuffer') é mais confiável que 'blob' para JSZip
      const pdfBytes = doc.output('arraybuffer');
      zip.file(`qrcodes/qrcode-${i + 1}.pdf`, pdfBytes);

    } catch (err) {
      console.warn(`Erro no card ${i + 1}:`, err);
      // Continua mesmo se um card falhar
    }
  }

  // ── Passo 6: compacta e dispara o download do ZIP ────────
  try {
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

    const url = URL.createObjectURL(zipBlob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = 'qrcodes.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Libera o objeto URL da memória após um breve delay
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    showToast(`✓ qrcodes.zip baixado com ${cards.length} PDF${cards.length > 1 ? 's' : ''}!`);

  } catch (err) {
    showToast('✦ Erro ao criar ZIP, tente novamente');
    console.error('Erro ao gerar ZIP:', err);
  }

  // Restaura o botão
  btnAll.disabled = false;
  btnAll.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2.5"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    Baixar todos (.zip)
  `;
}


/* ════════════════════════════════════════════════════════════════
   10. LIMPAR TUDO
   Remove todos os cards, esconde a barra de controles,
   exibe o estado vazio novamente e limpa os campos de input.
════════════════════════════════════════════════════════════════ */
function clearAll() {
  gridEl.innerHTML      = '';
  emptyEl.style.display = 'block';
  barEl.style.display   = 'none';
  inputEl.value         = '';
  legendEl.value        = '';
  inputEl.focus();
}


/* ════════════════════════════════════════════════════════════════
   11. UTILITÁRIOS

   escHtml(str)
   Escapa caracteres especiais HTML para evitar XSS ao injetar
   texto do usuário via innerHTML.
════════════════════════════════════════════════════════════════ */
function escHtml(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}