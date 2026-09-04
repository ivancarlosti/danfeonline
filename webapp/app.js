    (function() {
        'use strict';

        // =====================================================
        // STATE
        // =====================================================
        const state = {
            activeTab: 'consulta',
            accessKey: '',
            currentPdfUrl: null,
            pdfBlob: null,
            cameraFacingMode: 'environment',
            isCameraActive: false,
            parsedNFeData: null,
            selectedXmlFile: null,
            scanContext: 'consulta',  // 'consulta' | 'upload'
            zoomLevel: 1,
            theme: 'light',
            lang: 'pt',
            cnpjaSubtab: 'empresa',
        };

        // =====================================================
        // DOM REFERENCES
        // =====================================================
        const $ = (sel) => document.querySelector(sel);
        const $$ = (sel) => document.querySelectorAll(sel);

        const dom = {
            // Tabs
            tabBtns: $$('.tab-nav__btn'),
            panelConsulta: $('#panel-consulta'),
            panelUpload: $('#panel-upload'),
            panelNfe: $('#panel-nfe'),
            panelCnpja: $('#panel-cnpja'),

            // Tab 1: Consulta
            inputChave: $('#input-chave'),
            digitCount: $('#digit-count'),
            digitCounter: $('#digit-counter'),
            btnScan: $('#btn-scan'),
            btnConsultar: $('#btn-consultar'),
            fallbackApi: $('#fallback-api'),
            btnSwitchToUpload: $('#btn-switch-to-upload'),

            // Tab 2: Upload
            dropZone: $('#drop-zone'),
            fileInput: $('#file-input'),
            fileInfo: $('#file-info'),
            fileName: $('#file-name'),
            btnSelectFile: $('#btn-select-file'),
            btnGeneratePdf: $('#btn-generate-pdf'),
            btnHelpToggle: $('#btn-help-toggle'),
            helpContent: $('#help-content'),
            btnScanUpload: $('#btn-scan-upload'),
            scannedKeyDisplay: $('#scanned-key-display'),
            scannedKeyText: $('#scanned-key-text'),
            btnCopyKey: $('#btn-copy-key'),

            // Tab 3: NF-e Links Directory
            inputNfeFilter: $('#input-nfe-filter'),
            btnNfeFilterClear: $('#btn-nfe-filter-clear'),
            nfeLinksTbody: $('#nfe-links-tbody'),
            nfeResultsCount: $('#nfe-results-count'),
            nfeEmptyState: $('#nfe-empty-state'),

            // Tab 4: CNPJá
            cnpjaSubtabBtns: $$('.cnpja-subtab'),
            cnpjaPanelEmpresa: $('#cnpja-panel-empresa'),
            cnpjaPanelSocios: $('#cnpja-panel-socios'),
            inputCnpjaEmpresa: $('#input-cnpja-empresa'),
            inputCnpjaSocio: $('#input-cnpja-socio'),
            btnConsultarEmpresa: $('#btn-cnpja-consultar-empresa'),
            btnConsultarSocios: $('#btn-cnpja-consultar-socios'),
            cnpjaErrorEmpresa: $('#cnpja-error-empresa'),
            cnpjaErrorSocios: $('#cnpja-error-socios'),
            cnpjaResultEmpresa: $('#cnpja-result-empresa'),
            cnpjaResultSocios: $('#cnpja-result-socios'),
            cnpjaHistoryEmpresa: $('#cnpja-history-empresa'),
            cnpjaHistorySocios: $('#cnpja-history-socios'),

            // PDF Viewer
            pdfSection: $('#pdf-section'),
            downloadFilename: $('#download-filename'),
            btnDownload: $('#btn-download'),

            // Theme & Language
            btnThemeToggle: $('#btn-theme-toggle'),
            langFlags: $$('#lang-flags .lang-flag'),

            // Camera Modal
            cameraModal: $('#camera-modal'),
            modalBackdrop: $('#modal-backdrop'),
            cameraReader: $('#camera-reader'),
            cameraStatus: $('#camera-status'),
            btnCloseCamera: $('#btn-close-camera'),
            btnToggleCamera: $('#btn-toggle-camera'),
            btnRetryCamera: $('#btn-retry-camera'),
            zoomSlider: $('#zoom-slider'),
            zoomValue: $('#zoom-value'),

            // Overlays
            loadingOverlay: $('#loading-overlay'),
            loadingText: $('#loading-text'),
            toastContainer: $('#toast-container'),
        };

        // =====================================================
        // NF-E LINKS DATA — Municipal consultation links
        // =====================================================
        const NFE_LINKS = [
            { cidade: 'São Paulo', estado: 'SP', sistema: 'Nota Paulistana', link: 'https://nfe.prefeitura.sp.gov.br/publico/verificacao.aspx' },
            { cidade: 'Guarulhos', estado: 'SP', sistema: 'GINFES', link: 'https://guarulhos.ginfes.com.br/' },
            { cidade: 'Campinas', estado: 'SP', sistema: 'Portal Próprio', link: 'https://nfse.campinas.sp.gov.br/' },
            { cidade: 'São Bernardo do Campo', estado: 'SP', sistema: 'Portal da Fazenda', link: 'https://sf.saobernardo.sp.gov.br/' },
            { cidade: 'Santo André', estado: 'SP', sistema: 'GINFES', link: 'https://santoandre.ginfes.com.br/' },
            { cidade: 'Ribeirão Preto', estado: 'SP', sistema: 'GINFES', link: 'https://ribeiraopreto.ginfes.com.br/' },
            { cidade: 'Osasco', estado: 'SP', sistema: 'Portal Próprio', link: 'https://nfse.osasco.sp.gov.br/' },
            { cidade: 'Santos', estado: 'SP', sistema: 'Portal Próprio', link: 'https://nfse.santos.sp.gov.br/' },
            { cidade: 'São José dos Campos', estado: 'SP', sistema: 'Portal Próprio', link: 'https://nfse.sjc.sp.gov.br/' },
            { cidade: 'Sorocaba', estado: 'SP', sistema: 'Portal Próprio', link: 'https://nfse.sorocaba.sp.gov.br/' },
            { cidade: 'Jundiaí', estado: 'SP', sistema: 'Portal Próprio', link: 'https://nfse.jundiai.sp.gov.br/' },
            { cidade: 'Piracicaba', estado: 'SP', sistema: 'Portal Próprio', link: 'https://nfse.piracicaba.sp.gov.br/' },
            { cidade: 'São José do Rio Preto', estado: 'SP', sistema: 'Portal Próprio', link: 'https://nfse.riopreto.sp.gov.br/' },
            { cidade: 'Bauru', estado: 'SP', sistema: 'GINFES', link: 'https://bauru.ginfes.com.br/' },
            { cidade: 'Taubaté', estado: 'SP', sistema: 'Portal Próprio', link: 'https://nfse.taubate.sp.gov.br/' },
            { cidade: 'Rio de Janeiro', estado: 'RJ', sistema: 'Nota Carioca', link: 'https://notacarioca.rio.gov.br/' },
            { cidade: 'Niterói', estado: 'RJ', sistema: 'Portal Próprio', link: 'https://nfse.niteroi.rj.gov.br/' },
            { cidade: 'Belo Horizonte', estado: 'MG', sistema: 'Portal Próprio', link: 'https://nfse.pbh.gov.br/' },
            { cidade: 'Uberlândia', estado: 'MG', sistema: 'Portal Próprio', link: 'https://nfse.uberlandia.mg.gov.br/' },
            { cidade: 'Curitiba', estado: 'PR', sistema: 'Portal Próprio', link: 'https://nfse.curitiba.pr.gov.br/' },
            { cidade: 'Londrina', estado: 'PR', sistema: 'Portal Próprio', link: 'https://nfse.londrina.pr.gov.br/' },
            { cidade: 'Porto Alegre', estado: 'RS', sistema: 'Portal Próprio', link: 'https://nfse.portoalegre.rs.gov.br/' },
            { cidade: 'Caxias do Sul', estado: 'RS', sistema: 'Portal Próprio', link: 'https://nfse.caxias.rs.gov.br/' },
            { cidade: 'Salvador', estado: 'BA', sistema: 'Portal Próprio', link: 'https://nfse.salvador.ba.gov.br/' },
            { cidade: 'Brasília', estado: 'DF', sistema: 'Portal Próprio', link: 'https://nfse.fazenda.df.gov.br/' },
            { cidade: 'Fortaleza', estado: 'CE', sistema: 'Portal Próprio', link: 'https://nfse.fortaleza.ce.gov.br/' },
            { cidade: 'Recife', estado: 'PE', sistema: 'Portal Próprio', link: 'https://nfse.recife.pe.gov.br/' },
            { cidade: 'Manaus', estado: 'AM', sistema: 'Portal Próprio', link: 'https://nfse.manaus.am.gov.br/' },
            { cidade: 'Florianópolis', estado: 'SC', sistema: 'Portal Próprio', link: 'https://nfse.florianopolis.sc.gov.br/' },
            { cidade: 'Joinville', estado: 'SC', sistema: 'Portal Próprio', link: 'https://nfse.joinville.sc.gov.br/' },
            { cidade: 'Goiânia', estado: 'GO', sistema: 'Portal Próprio', link: 'https://nfse.goiania.go.gov.br/' },
            { cidade: 'São Luís', estado: 'MA', sistema: 'Portal Próprio', link: 'https://nfse.saoluis.ma.gov.br/' },
            { cidade: 'Natal', estado: 'RN', sistema: 'Portal Próprio', link: 'https://nfse.natal.rn.gov.br/' },
            { cidade: 'João Pessoa', estado: 'PB', sistema: 'Portal Próprio', link: 'https://nfse.joaopessoa.pb.gov.br/' },
            { cidade: 'Maceió', estado: 'AL', sistema: 'Portal Próprio', link: 'https://nfse.maceio.al.gov.br/' },
            { cidade: 'Aracaju', estado: 'SE', sistema: 'Portal Próprio', link: 'https://nfse.aracaju.se.gov.br/' },
            { cidade: 'Vitória', estado: 'ES', sistema: 'Portal Próprio', link: 'https://nfse.vitoria.es.gov.br/' },
            { cidade: 'Cuiabá', estado: 'MT', sistema: 'Portal Próprio', link: 'https://nfse.cuiaba.mt.gov.br/' },
            { cidade: 'Campo Grande', estado: 'MS', sistema: 'Portal Próprio', link: 'https://nfse.campogrande.ms.gov.br/' },
            { cidade: 'Teresina', estado: 'PI', sistema: 'Portal Próprio', link: 'https://nfse.teresina.pi.gov.br/' },
            { cidade: 'Palmas', estado: 'TO', sistema: 'Portal Próprio', link: 'https://nfse.palmas.to.gov.br/' },
            { cidade: 'Porto Velho', estado: 'RO', sistema: 'Portal Próprio', link: 'https://nfse.portovelho.ro.gov.br/' },
            { cidade: 'Rio Branco', estado: 'AC', sistema: 'Portal Próprio', link: 'https://nfse.riobranco.ac.gov.br/' },
            { cidade: 'Macapá', estado: 'AP', sistema: 'Portal Próprio', link: 'https://nfse.macapa.ap.gov.br/' },
            { cidade: 'Boa Vista', estado: 'RR', sistema: 'Portal Próprio', link: 'https://nfse.boavista.rr.gov.br/' },
        ];

        // NF-e Links: render table with optional filter
        function renderNfeLinks(filterText) {
            const filter = (filterText || '').toLowerCase().trim();
            let filtered = NFE_LINKS;

            if (filter) {
                filtered = NFE_LINKS.filter(item =>
                    item.cidade.toLowerCase().includes(filter) ||
                    item.estado.toLowerCase().includes(filter) ||
                    item.sistema.toLowerCase().includes(filter)
                );
            }

            // Update results count
            dom.nfeResultsCount.textContent = filtered.length;

            // Show/hide empty state
            dom.nfeEmptyState.style.display = filtered.length === 0 ? 'block' : 'none';

            // Build table rows
            dom.nfeLinksTbody.innerHTML = filtered.map(item => {
                let sistemaClass = 'nfe-sistema-tag';
                if (item.sistema === 'GINFES') sistemaClass += ' nfe-sistema-tag--ginfes';
                else if (item.sistema === 'Nota Paulistana' || item.sistema === 'Nota Carioca') sistemaClass += ' nfe-sistema-tag--capital';

                return `
                    <tr>
                        <td><strong>${escapeHtml(item.cidade)}</strong></td>
                        <td><span class="nfe-estado-badge">${escapeHtml(item.estado)}</span></td>
                        <td><span class="${sistemaClass}">${escapeHtml(item.sistema)}</span></td>
                        <td>
                            <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener"
                               class="nfe-link-btn" title="Abrir portal de ${escapeHtml(item.cidade)}">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> Acessar
                            </a>
                        </td>
                    </tr>
                `;
            }).join('');

            // Toggle clear button
            dom.btnNfeFilterClear.style.display = filter ? 'flex' : 'none';
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        // Filter input event
        let nfeFilterTimeout;
        dom.inputNfeFilter.addEventListener('input', () => {
            clearTimeout(nfeFilterTimeout);
            nfeFilterTimeout = setTimeout(() => {
                renderNfeLinks(dom.inputNfeFilter.value);
            }, 150);
        });

        // Clear filter button
        dom.btnNfeFilterClear.addEventListener('click', () => {
            dom.inputNfeFilter.value = '';
            renderNfeLinks('');
            dom.inputNfeFilter.focus();
        });

        // =====================================================
        // INTERNATIONALIZATION (i18n)
        // =====================================================
        const i18n = {
            pt: {
                headerTitle: 'DANFE Online',
                headerSubtitle: 'Visualização e Geração de DANFE',
                tabConsulta: 'Consulta por Chave',
                tabUpload: 'Upload de XML',
                inputLabel: 'Digite os 44 dígitos da chave de acesso',
                inputPlaceholder: '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000',
                digitHint1: 'dígitos',
                digitHint2: 'A chave está no DANFE impresso ou no XML da NFe',
                btnScan: 'Escanear com Câmera',
                btnConsultar: 'Consultar e Gerar PDF',
                cardTitle1: 'Chave de Acesso da NFe',
                cardTitle2: 'Enviar Arquivo XML da NFe',
                dropText: 'Arraste o arquivo XML aqui',
                dropSubtext: 'ou clique para selecionar',
                btnSelectFile: 'Selecionar Arquivo',
                btnGeneratePdf: 'Gerar DANFE (PDF)',
                btnDownload: 'Baixar PDF',
                downloadReady: 'DANFE pronto para download',
                downloadSuccess: 'PDF gerado com sucesso!',
                helpToggle: 'Como obter o XML da NFe?',
                helpIntro: 'O XML da NFe é o arquivo oficial da nota fiscal eletrônica. Você pode obtê-lo de várias formas:',
                helpItem1: 'Portal da SEFAZ — Acesse o Portal Nacional da NFe, digite a chave de acesso de 44 dígitos e faça o download do XML.',
                helpItem2: 'E-mail — O arquivo XML geralmente é enviado por e-mail junto com o DANFE em PDF. Procure por mensagens do remetente ou do seu sistema ERP.',
                helpItem3: 'Sistema ERP / Emissor de NFe — Se você usa um sistema como Nota Fiscal Eletrônica, SPED, ou similar, o XML fica salvo no histórico de notas emitidas.',
                helpItem4: 'Portal da SEFAZ Estadual — Cada estado tem seu próprio portal de consulta (ex: SEFAZ-SP, SEFAZ-MG, SEFAZ-RJ) onde é possível baixar o XML informando a chave de acesso.',
                helpItem5: 'Site do fornecedor — Muitos fornecedores disponibilizam o XML da sua compra na área do cliente ou no histórico de pedidos.',
                helpTip: 'Dica: O XML é a forma mais confiável de gerar o DANFE, pois contém todos os dados oficiais da nota fiscal e funciona 100% offline, sem depender de APIs externas.',
                fallbackTitle: 'Não foi possível consultar a API',
                fallbackText1: 'A consulta automática via meudanfe.com.br não está disponível no momento (limite de requisições ou falha na API).',
                fallbackText2: 'Recomendado: Use a aba "Upload de XML" — é 100% offline, não depende de APIs externas e é a forma mais confiável de gerar o DANFE.',
                fallbackBtn: 'Ir para Upload de XML',
                fallbackText3: 'Também é possível consultar diretamente no portal da SEFAZ:',
                fallbackLink: 'Consultar no Portal da NFe',
                loadingDefault: 'Processando...',
                loadingConsultar: 'Consultando DANFE...',
                loadingXmlRead: 'Lendo arquivo XML...',
                loadingXmlProcess: 'Processando dados da NFe...',
                loadingXmlGenerate: 'Gerando DANFE em PDF...',
                toastChaveLength: 'A chave de acesso deve ter exatamente 44 dígitos.',
                toastApiCors: 'Não foi possível acessar a API. Veja as alternativas abaixo.',
                toastDanfeSuccess: 'DANFE gerado com sucesso!',
                toastXmlSuccess: 'DANFE gerado com sucesso!',
                toastXmlError: 'Erro ao processar XML:',
                toastXmlInvalid: 'Arquivo XML inválido ou não é uma NFe válida.',
                toastNoPdf: 'Nenhum PDF disponível para download.',
                toastDownloadStarted: 'Download iniciado!',
                toastSelectXml: 'Selecione um arquivo XML primeiro.',
                toastInvalidXml: 'Por favor, selecione um arquivo .xml válido.',
                toastCameraDenied: 'Permissão de câmera negada. Verifique as configurações do navegador.',
                toastCameraBusy: 'Câmera indisponível. Feche outros aplicativos que possam estar usando a câmera.',
                toastCameraError: 'Erro ao acessar a câmera. Tente novamente.',
                toastScanSuccess: 'Chave de acesso capturada com sucesso!',
                toastPdfmakeMissing: 'Aviso: biblioteca pdfmake não carregada. A geração de PDF a partir de XML pode não funcionar.',
                cameraStarting: 'Iniciando câmera...',
                cameraReady: 'Posicione o código de barras do DANFE na área de leitura',
                cameraScanned: '✅ Código lido com sucesso!',
                cameraBadDigits: 'Código lido com {0} dígitos (esperado: 44). Tente novamente.',
                cameraToggle: 'Alternar Câmera',
                cameraRetry: 'Tentar Novamente',
                cameraClose: 'Fechar câmera',
                chaveHint: 'A chave está no DANFE impresso ou no XML da NFe',
                portalNFeLinkText: 'Portal Nacional da NFe',
                tabNfe: 'Consulta NF-e',
                nfeNationalBadge: 'NACIONAL',
                nfeNationalTitle: 'Sistema Nacional — NFS-e',
                nfeNationalDesc: 'Busca unificada nacional. Todas as notas emitidas por MEIs (Microempreendedores Individuais) do Brasil inteiro devem ser consultadas aqui, além de notas de empresas cujas prefeituras já aderiram integralmente ao sistema nacional.',
                nfeNationalLinkText: 'Acessar Consulta Pública Nacional',
                nfeTableTitle: 'Consultas por Município',
                nfeFilterPlaceholder: 'Filtrar por cidade ou estado...',
                nfeResultsFound: 'municípios encontrados',
                nfeTableCity: 'Cidade',
                nfeTableState: 'Estado',
                nfeTableSystem: 'Sistema',
                nfeTableLink: 'Link',
                nfeNoResults: 'Nenhum município encontrado para este filtro.',
                nfeGinfesTip: 'Dica: Se a nota for de outra cidade que usa GINFES (ex: Santo André, Ribeirão Preto, Bauru), a lógica é a mesma — basta substituir o início do site (cidade.ginfes.com.br). Em qualquer um deles, clique em "Verificar Autenticidade".',
                tabCnpja: 'Consulta CNPJ',
                cnpjaTitle: 'Consulta CNPJ',
                cnpjaSubtabEmpresa: 'Empresa',
                cnpjaSubtabSocios: 'Sócios',
                cnpjaEmpresaLabel: 'CNPJ ou nome da empresa',
                cnpjaEmpresaPlaceholder: 'CNPJ, razão social ou nome fantasia',
                cnpjaEmpresaHint: 'Informe um CNPJ para abrir o cadastro ou um nome para buscar opções',
                cnpjaSociosLabel: 'CPF ou nome do sócio',
                cnpjaSociosPlaceholder: 'CPF ou nome do sócio',
                cnpjaSociosHint: 'Informe um CPF ou nome para buscar pessoas e suas participações',
                cnpjaBtnConsultar: 'Consultar',
                cnpjaEmpresaShort: 'Informe um CNPJ válido ou pelo menos 2 caracteres para buscar.',
                cnpjaSocioShort: 'Informe um CPF válido ou pelo menos 2 caracteres para buscar.',
                cnpjaResultsTitle: 'Resultados encontrados',
                cnpjaPartnersTitle: 'Sócios e administradores',
                cnpjaFieldAge: 'Idade',
                cnpjaLoading: 'Consultando CNPJá...',
                cnpjaInvalidCnpj: 'O CNPJ deve ter exatamente 14 dígitos.',
                cnpjaInvalidCpf: 'O CPF deve ter exatamente 11 dígitos.',
                cnpjaApiError: 'Não foi possível consultar a API CNPJá.',
                cnpjaNoResults: 'Nenhum dado encontrado para esta consulta.',
                cnpjaHistoryTitle: 'Consultas recentes',
                cnpjaHistoryClear: 'Limpar',
                cnpjaHistoryEmpty: 'Nenhuma consulta recente.',
                cnpjaFieldName: 'Nome',
                cnpjaFieldAlias: 'Nome Fantasia',
                cnpjaFieldTaxId: 'CNPJ',
                cnpjaFieldPersonTaxId: 'CPF',
                cnpjaFieldStatus: 'Situação',
                cnpjaFieldFounded: 'Abertura',
                cnpjaFieldMainActivity: 'Atividade Principal',
                cnpjaFieldAddress: 'Endereço',
                cnpjaFieldNature: 'Natureza Jurídica',
                cnpjaFieldSize: 'Porte',
                cnpjaFieldRole: 'Qualificação',
                cnpjaFieldSince: 'Desde',
                cnpjaFieldCapital: 'Capital Social',
                cnpjaCompanyListTitle: 'Empresas como sócio',
            },
            en: {
                headerTitle: 'DANFE Online',
                headerSubtitle: 'DANFE Visualization & Generation',
                tabConsulta: 'Search by Key',
                tabUpload: 'Upload XML',
                inputLabel: 'Enter the 44-digit access key',
                inputPlaceholder: '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000',
                digitHint1: 'digits',
                digitHint2: 'The key is on the printed DANFE or in the NFe XML',
                btnScan: 'Scan with Camera',
                btnConsultar: 'Search and Generate PDF',
                cardTitle1: 'NFe Access Key',
                cardTitle2: 'Upload NFe XML File',
                dropText: 'Drag and drop the XML file here',
                dropSubtext: 'or click to select',
                btnSelectFile: 'Select File',
                btnGeneratePdf: 'Generate DANFE (PDF)',
                btnDownload: 'Download PDF',
                downloadReady: 'DANFE ready for download',
                downloadSuccess: 'PDF generated successfully!',
                helpToggle: 'How to obtain the NFe XML?',
                helpIntro: 'The NFe XML is the official electronic invoice file. You can obtain it in several ways:',
                helpItem1: 'SEFAZ Portal — Access the National NFe Portal, enter the 44-digit access key, and download the XML.',
                helpItem2: 'Email — The XML file is usually sent by email along with the DANFE PDF. Look for messages from the sender or your ERP system.',
                helpItem3: 'ERP / NFe Issuer System — If you use a system like Electronic Invoice, SPED, or similar, the XML is saved in the issued invoices history.',
                helpItem4: 'State SEFAZ Portal — Each state has its own query portal (e.g., SEFAZ-SP, SEFAZ-MG, SEFAZ-RJ) where you can download the XML using the access key.',
                helpItem5: 'Supplier website — Many suppliers provide the XML of your purchase in the customer area or order history.',
                helpTip: 'Tip: XML is the most reliable way to generate the DANFE, as it contains all official invoice data and works 100% offline, without relying on external APIs.',
                fallbackTitle: 'Could not query the API',
                fallbackText1: 'The automatic query via meudanfe.com.br is currently unavailable (rate limit or API failure).',
                fallbackText2: 'Recommended: Use the "Upload XML" tab — it\'s 100% offline, does not depend on external APIs, and is the most reliable way to generate the DANFE.',
                fallbackBtn: 'Go to XML Upload',
                fallbackText3: 'You can also query directly on the SEFAZ portal:',
                fallbackLink: 'Query on NFe Portal',
                loadingDefault: 'Processing...',
                loadingConsultar: 'Querying DANFE...',
                loadingXmlRead: 'Reading XML file...',
                loadingXmlProcess: 'Processing NFe data...',
                loadingXmlGenerate: 'Generating DANFE PDF...',
                toastChaveLength: 'The access key must have exactly 44 digits.',
                toastApiCors: 'Could not access the API. See alternatives below.',
                toastDanfeSuccess: 'DANFE generated successfully!',
                toastXmlSuccess: 'DANFE generated successfully!',
                toastXmlError: 'Error processing XML:',
                toastXmlInvalid: 'Invalid XML file or not a valid NFe.',
                toastNoPdf: 'No PDF available for download.',
                toastDownloadStarted: 'Download started!',
                toastSelectXml: 'Please select an XML file first.',
                toastInvalidXml: 'Please select a valid .xml file.',
                toastCameraDenied: 'Camera permission denied. Check your browser settings.',
                toastCameraBusy: 'Camera unavailable. Close other apps that might be using the camera.',
                toastCameraError: 'Error accessing camera. Please try again.',
                toastScanSuccess: 'Access key captured successfully!',
                toastPdfmakeMissing: 'Warning: pdfmake library not loaded. PDF generation from XML may not work.',
                cameraStarting: 'Starting camera...',
                cameraReady: 'Position the DANFE barcode in the scanning area',
                cameraScanned: '✅ Code scanned successfully!',
                cameraBadDigits: 'Code read with {0} digits (expected: 44). Try again.',
                cameraToggle: 'Switch Camera',
                cameraRetry: 'Try Again',
                cameraClose: 'Close camera',
                chaveHint: 'The key is on the printed DANFE or in the NFe XML',
                portalNFeLinkText: 'National NFe Portal',
                tabNfe: 'NF-e Lookup',
                nfeNationalBadge: 'NATIONAL',
                nfeNationalTitle: 'National System — NFS-e',
                nfeNationalDesc: 'Unified national search. All invoices issued by MEIs (Individual Microentrepreneurs) across Brazil must be looked up here, as well as invoices from companies whose municipalities have fully joined the national system.',
                nfeNationalLinkText: 'Access National Public Query',
                nfeTableTitle: 'Lookup by Municipality',
                nfeFilterPlaceholder: 'Filter by city or state...',
                nfeResultsFound: 'municipalities found',
                nfeTableCity: 'City',
                nfeTableState: 'State',
                nfeTableSystem: 'System',
                nfeTableLink: 'Link',
                nfeNoResults: 'No municipalities found for this filter.',
                nfeGinfesTip: 'Tip: If the invoice is from another city using GINFES (e.g., Santo André, Ribeirão Preto, Bauru), the logic is the same — just replace the beginning of the URL (city.ginfes.com.br). In any of them, click "Verificar Autenticidade" (Verify Authenticity).',
                tabCnpja: 'CNPJ Lookup',
                cnpjaTitle: 'CNPJ Lookup',
                cnpjaSubtabEmpresa: 'Company',
                cnpjaSubtabSocios: 'Partners',
                cnpjaEmpresaLabel: 'Company CNPJ or name',
                cnpjaEmpresaPlaceholder: 'CNPJ, legal name or trade name',
                cnpjaEmpresaHint: 'Enter a CNPJ to open the record or a name to search options',
                cnpjaSociosLabel: 'Partner CPF or name',
                cnpjaSociosPlaceholder: 'Partner CPF or name',
                cnpjaSociosHint: 'Enter a CPF or name to search people and their memberships',
                cnpjaBtnConsultar: 'Search',
                cnpjaEmpresaShort: 'Enter a valid CNPJ or at least 2 characters to search.',
                cnpjaSocioShort: 'Enter a valid CPF or at least 2 characters to search.',
                cnpjaResultsTitle: 'Results found',
                cnpjaPartnersTitle: 'Partners and officers',
                cnpjaFieldAge: 'Age',
                cnpjaLoading: 'Querying CNPJá...',
                cnpjaInvalidCnpj: 'CNPJ must have exactly 14 digits.',
                cnpjaInvalidCpf: 'CPF must have exactly 11 digits.',
                cnpjaApiError: 'Could not query the CNPJá API.',
                cnpjaNoResults: 'No data found for this query.',
                cnpjaHistoryTitle: 'Recent lookups',
                cnpjaHistoryClear: 'Clear',
                cnpjaHistoryEmpty: 'No recent lookups.',
                cnpjaFieldName: 'Name',
                cnpjaFieldAlias: 'Trade Name',
                cnpjaFieldTaxId: 'CNPJ',
                cnpjaFieldPersonTaxId: 'CPF',
                cnpjaFieldStatus: 'Status',
                cnpjaFieldFounded: 'Founded',
                cnpjaFieldMainActivity: 'Main Activity',
                cnpjaFieldAddress: 'Address',
                cnpjaFieldNature: 'Legal Nature',
                cnpjaFieldSize: 'Size',
                cnpjaFieldRole: 'Role',
                cnpjaFieldSince: 'Since',
                cnpjaFieldCapital: 'Capital',
                cnpjaCompanyListTitle: 'Companies as partner',
            },
            es: {
                headerTitle: 'DANFE Online',
                headerSubtitle: 'Visualización y Generación de DANFE',
                tabConsulta: 'Buscar por Clave',
                tabUpload: 'Subir XML',
                inputLabel: 'Ingrese los 44 dígitos de la clave de acceso',
                inputPlaceholder: '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000',
                digitHint1: 'dígitos',
                digitHint2: 'La clave está en el DANFE impreso o en el XML de la NFe',
                btnScan: 'Escanear con Cámara',
                btnConsultar: 'Buscar y Generar PDF',
                cardTitle1: 'Clave de Acceso de la NFe',
                cardTitle2: 'Subir Archivo XML de la NFe',
                dropText: 'Arrastre el archivo XML aquí',
                dropSubtext: 'o haga clic para seleccionar',
                btnSelectFile: 'Seleccionar Archivo',
                btnGeneratePdf: 'Generar DANFE (PDF)',
                btnDownload: 'Descargar PDF',
                downloadReady: 'DANFE listo para descargar',
                downloadSuccess: '¡PDF generado exitosamente!',
                helpToggle: '¿Cómo obtener el XML de la NFe?',
                helpIntro: 'El XML de la NFe es el archivo oficial de la factura electrónica. Puede obtenerlo de varias formas:',
                helpItem1: 'Portal SEFAZ — Acceda al Portal Nacional de la NFe, ingrese la clave de acceso de 44 dígitos y descargue el XML.',
                helpItem2: 'Correo electrónico — El archivo XML generalmente se envía por correo junto con el DANFE en PDF. Busque mensajes del remitente o de su sistema ERP.',
                helpItem3: 'Sistema ERP / Emisor de NFe — Si utiliza un sistema como Factura Electrónica, SPED o similar, el XML se guarda en el historial de facturas emitidas.',
                helpItem4: 'Portal SEFAZ Estatal — Cada estado tiene su propio portal de consulta (ej: SEFAZ-SP, SEFAZ-MG, SEFAZ-RJ) donde puede descargar el XML con la clave de acceso.',
                helpItem5: 'Sitio del proveedor — Muchos proveedores ponen a disposición el XML de su compra en el área de cliente o en el historial de pedidos.',
                helpTip: 'Consejo: El XML es la forma más confiable de generar el DANFE, ya que contiene todos los datos oficiales de la factura y funciona 100% sin conexión, sin depender de APIs externas.',
                fallbackTitle: 'No se pudo consultar la API',
                fallbackText1: 'La consulta automática a través de meudanfe.com.br no está disponible en este momento (límite de solicitudes o falla de la API).',
                fallbackText2: 'Recomendado: Use la pestaña "Subir XML" — es 100% sin conexión, no depende de APIs externas y es la forma más confiable de generar el DANFE.',
                fallbackBtn: 'Ir a Subir XML',
                fallbackText3: 'También puede consultar directamente en el portal de la SEFAZ:',
                fallbackLink: 'Consultar en el Portal de la NFe',
                loadingDefault: 'Procesando...',
                loadingConsultar: 'Consultando DANFE...',
                loadingXmlRead: 'Leyendo archivo XML...',
                loadingXmlProcess: 'Procesando datos de la NFe...',
                loadingXmlGenerate: 'Generando DANFE en PDF...',
                toastChaveLength: 'La clave de acceso debe tener exactamente 44 dígitos.',
                toastApiCors: 'No se pudo acceder a la API. Vea las alternativas a continuación.',
                toastDanfeSuccess: '¡DANFE generado exitosamente!',
                toastXmlSuccess: '¡DANFE generado exitosamente!',
                toastXmlError: 'Error al procesar XML:',
                toastXmlInvalid: 'Archivo XML inválido o no es una NFe válida.',
                toastNoPdf: 'No hay PDF disponible para descargar.',
                toastDownloadStarted: '¡Descarga iniciada!',
                toastSelectXml: 'Seleccione un archivo XML primero.',
                toastInvalidXml: 'Por favor, seleccione un archivo .xml válido.',
                toastCameraDenied: 'Permiso de cámara denegado. Verifique la configuración de su navegador.',
                toastCameraBusy: 'Cámara no disponible. Cierre otras aplicaciones que puedan estar usando la cámara.',
                toastCameraError: 'Error al acceder a la cámara. Intente nuevamente.',
                toastScanSuccess: '¡Clave de acceso capturada exitosamente!',
                toastPdfmakeMissing: 'Aviso: biblioteca pdfmake no cargada. La generación de PDF desde XML puede no funcionar.',
                cameraStarting: 'Iniciando cámara...',
                cameraReady: 'Coloque el código de barras del DANFE en el área de escaneo',
                cameraScanned: '✅ ¡Código leído exitosamente!',
                cameraBadDigits: 'Código leído con {0} dígitos (esperado: 44). Intente nuevamente.',
                cameraToggle: 'Cambiar Cámara',
                cameraRetry: 'Intentar de Nuevo',
                cameraClose: 'Cerrar cámara',
                chaveHint: 'La clave está en el DANFE impreso o en el XML de la NFe',
                portalNFeLinkText: 'Portal Nacional de la NFe',
                tabNfe: 'Consulta NF-e',
                nfeNationalBadge: 'NACIONAL',
                nfeNationalTitle: 'Sistema Nacional — NFS-e',
                nfeNationalDesc: 'Búsqueda unificada nacional. Todas las facturas emitidas por MEIs (Microempreendedores Individuales) de todo Brasil deben consultarse aquí, además de facturas de empresas cuyos municipios ya se han adherido integralmente al sistema nacional.',
                nfeNationalLinkText: 'Acceder a la Consulta Pública Nacional',
                nfeTableTitle: 'Consultas por Municipio',
                nfeFilterPlaceholder: 'Filtrar por ciudad o estado...',
                nfeResultsFound: 'municipios encontrados',
                nfeTableCity: 'Ciudad',
                nfeTableState: 'Estado',
                nfeTableSystem: 'Sistema',
                nfeTableLink: 'Enlace',
                nfeNoResults: 'No se encontraron municipios para este filtro.',
                nfeGinfesTip: 'Consejo: Si la factura es de otra ciudad que usa GINFES (ej: Santo André, Ribeirão Preto, Bauru), la lógica es la misma — solo sustituya el inicio del sitio (ciudad.ginfes.com.br). En cualquiera de ellos, haga clic en "Verificar Autenticidade".',
                tabCnpja: 'Consulta CNPJ',
                cnpjaTitle: 'Consulta CNPJ',
                cnpjaSubtabEmpresa: 'Empresa',
                cnpjaSubtabSocios: 'Socios',
                cnpjaEmpresaLabel: 'CNPJ o nombre de la empresa',
                cnpjaEmpresaPlaceholder: 'CNPJ, razón social o nombre comercial',
                cnpjaEmpresaHint: 'Informe un CNPJ para abrir el registro o un nombre para buscar opciones',
                cnpjaSociosLabel: 'CPF o nombre del socio',
                cnpjaSociosPlaceholder: 'CPF o nombre del socio',
                cnpjaSociosHint: 'Informe un CPF o nombre para buscar personas y sus participaciones',
                cnpjaBtnConsultar: 'Consultar',
                cnpjaEmpresaShort: 'Informe un CNPJ válido o al menos 2 caracteres para buscar.',
                cnpjaSocioShort: 'Informe un CPF válido o al menos 2 caracteres para buscar.',
                cnpjaResultsTitle: 'Resultados encontrados',
                cnpjaPartnersTitle: 'Socios y administradores',
                cnpjaFieldAge: 'Edad',
                cnpjaLoading: 'Consultando CNPJá...',
                cnpjaInvalidCnpj: 'El CNPJ debe tener exactamente 14 dígitos.',
                cnpjaInvalidCpf: 'El CPF debe tener exactamente 11 dígitos.',
                cnpjaApiError: 'No se pudo consultar la API CNPJá.',
                cnpjaNoResults: 'No se encontraron datos para esta consulta.',
                cnpjaHistoryTitle: 'Consultas recientes',
                cnpjaHistoryClear: 'Limpiar',
                cnpjaHistoryEmpty: 'No hay consultas recientes.',
                cnpjaFieldName: 'Nombre',
                cnpjaFieldAlias: 'Nombre Comercial',
                cnpjaFieldTaxId: 'CNPJ',
                cnpjaFieldPersonTaxId: 'CPF',
                cnpjaFieldStatus: 'Situación',
                cnpjaFieldFounded: 'Apertura',
                cnpjaFieldMainActivity: 'Actividad Principal',
                cnpjaFieldAddress: 'Dirección',
                cnpjaFieldNature: 'Naturaleza Jurídica',
                cnpjaFieldSize: 'Tamaño',
                cnpjaFieldRole: 'Calificación',
                cnpjaFieldSince: 'Desde',
                cnpjaFieldCapital: 'Capital Social',
                cnpjaCompanyListTitle: 'Empresas como socio',
            },
        };

        function t(key, ...args) {
            let str = (i18n[state.lang] && i18n[state.lang][key]) || i18n.pt[key] || key;
            args.forEach((arg, i) => { str = str.replace(`{${i}}`, arg); });
            return str;
        }

        function applyTranslations() {
            // Update elements with data-i18n attribute
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.dataset.i18n;
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    if (el.dataset.i18nAttr === 'placeholder') {
                        el.placeholder = t(key);
                    } else {
                        el.value = t(key);
                    }
                } else {
                    el.textContent = t(key);
                }
            });

            // Update elements with data-i18n-title
            document.querySelectorAll('[data-i18n-title]').forEach(el => {
                el.title = t(el.dataset.i18nTitle);
            });

            // Update elements with data-i18n-aria
            document.querySelectorAll('[data-i18n-aria]').forEach(el => {
                el.setAttribute('aria-label', t(el.dataset.i18nAria));
            });

            // Update active flag
            dom.langFlags.forEach(flag => {
                const isActive = flag.dataset.lang === state.lang;
                flag.classList.toggle('lang-flag--active', isActive);
            });
        }

        function setLanguage(lang) {
            state.lang = lang;
            localStorage.setItem('danfe-lang', lang);
            applyTranslations();
        }

        // =====================================================
        // THEME TOGGLE
        // =====================================================
        function applyTheme(theme) {
            state.theme = theme;
            document.body.classList.toggle('theme-dark', theme === 'dark');
            const icon = dom.btnThemeToggle.querySelector('i');
            icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            localStorage.setItem('danfe-theme', theme);
        }

        function toggleTheme() {
            applyTheme(state.theme === 'dark' ? 'light' : 'dark');
        }

        dom.btnThemeToggle.addEventListener('click', toggleTheme);

        // Language flag clicks
        dom.langFlags.forEach(flag => {
            flag.addEventListener('click', () => setLanguage(flag.dataset.lang));
        });

        // =====================================================
        // UTILITY FUNCTIONS
        // =====================================================

        /** Strip all non-digit characters from string */
        function onlyDigits(str) {
            return str.replace(/\D/g, '');
        }

        /** Format 44-digit key as groups of 4 */
        function formatChave(digits) {
            const groups = [];
            for (let i = 0; i < digits.length; i += 4) {
                groups.push(digits.substring(i, i + 4));
            }
            return groups.join(' ');
        }

        /** Format CNPJ: XX.XXX.XXX/XXXX-XX */
        function formatCNPJ(cnpj) {
            const d = onlyDigits(cnpj);
            if (d.length !== 14) return cnpj;
            return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
        }

        /** Format CPF: XXX.XXX.XXX-XX */
        function formatCPF(cpf) {
            const d = onlyDigits(cpf);
            if (d.length !== 11) return cpf;
            return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
        }

        /** Format date from ISO to pt-BR */
        function formatDate(dateStr) {
            if (!dateStr) return '—';
            const dt = dateStr.substring(0, 10); // YYYY-MM-DD
            const [y, m, d] = dt.split('-');
            return `${d}/${m}/${y}`;
        }

        /** Format date/time from NFe format (YYYY-MM-DDTHH:MM:SS) */
        function formatDateTime(dateStr) {
            if (!dateStr) return '—';
            const dt = dateStr.substring(0, 16);
            const [date, time] = dt.split('T');
            const [y, m, d] = date.split('-');
            return `${d}/${m}/${y} ${time}`;
        }

        /** Format currency value (string to pt-BR) */
        function formatCurrency(value) {
            if (value === null || value === undefined || value === '') return '—';
            const num = parseFloat(value);
            if (isNaN(num)) return value;
            return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        /** Safe text extraction from XML */
        function xmlText(el, tag, ns) {
            if (!el) return '';
            let child;
            if (ns) {
                child = el.getElementsByTagNameNS(ns, tag)[0];
            }
            if (!child) {
                child = el.getElementsByTagName(tag)[0];
            }
            return child ? (child.textContent || '').trim() : '';
        }

        // =====================================================
        // TOAST NOTIFICATION SYSTEM
        // =====================================================
        function showToast(message, type = 'info', duration = 5000) {
            const icons = {
                success: 'fa-circle-check',
                error: 'fa-circle-xmark',
                warning: 'fa-triangle-exclamation',
                info: 'fa-circle-info',
            };

            const toast = document.createElement('div');
            toast.className = `toast toast--${type}`;
            toast.innerHTML = `
                <i class="fa-solid ${icons[type]} toast__icon"></i>
                <span class="toast__text">${message}</span>
                <button class="toast__close" aria-label="Fechar">&times;</button>
            `;

            toast.addEventListener('click', (e) => {
                if (e.target.classList.contains('toast__close')) return;
                removeToast(toast);
            });

            toast.querySelector('.toast__close').addEventListener('click', (e) => {
                e.stopPropagation();
                removeToast(toast);
            });

            dom.toastContainer.appendChild(toast);

            if (duration > 0) {
                setTimeout(() => removeToast(toast), duration);
            }
        }

        function removeToast(toast) {
            if (toast.classList.contains('toast--removing')) return;
            toast.classList.add('toast--removing');
            toast.addEventListener('animationend', () => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            });
        }

        // =====================================================
        // LOADING OVERLAY
        // =====================================================
        function showLoading(text = 'Processando...') {
            dom.loadingText.textContent = text;
            dom.loadingOverlay.classList.add('loading-overlay--visible');
        }

        function hideLoading() {
            dom.loadingOverlay.classList.remove('loading-overlay--visible');
        }

        // =====================================================
        // TAB CONTROLLER
        // =====================================================
        function switchTab(tabName) {
            state.activeTab = tabName;

            dom.tabBtns.forEach(btn => {
                const isActive = btn.dataset.tab === tabName;
                btn.classList.toggle('tab-nav__btn--active', isActive);
                btn.setAttribute('aria-selected', isActive);
            });

            dom.panelConsulta.classList.toggle('tab-panel--active', tabName === 'consulta');
            dom.panelUpload.classList.toggle('tab-panel--active', tabName === 'upload');
            dom.panelNfe.classList.toggle('tab-panel--active', tabName === 'nfe');
            dom.panelCnpja.classList.toggle('tab-panel--active', tabName === 'cnpja');
        }

        dom.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        // Also allow the fallback "Ir para Upload de XML" button to switch tabs
        dom.btnSwitchToUpload.addEventListener('click', () => switchTab('upload'));

        // =====================================================
        // INPUT MASK & VALIDATION (44-digit access key)
        // =====================================================
        function updateChaveInput() {
            const raw = dom.inputChave.value;
            const digits = onlyDigits(raw);
            const cursorPos = dom.inputChave.selectionStart;
            const rawBeforeCursor = raw.substring(0, cursorPos);
            const digitsBeforeCursor = onlyDigits(rawBeforeCursor).length;

            // Truncate to 44 digits
            const clamped = digits.substring(0, 44);
            state.accessKey = clamped;

            // Apply mask
            const masked = formatChave(clamped);
            dom.inputChave.value = masked;

            // Restore cursor position
            if (clamped.length > 0) {
                let newPos = 0;
                let digitCount = 0;
                for (let i = 0; i < masked.length; i++) {
                    if (masked[i] !== ' ') digitCount++;
                    if (digitCount > digitsBeforeCursor) break;
                    newPos = i + 1;
                }
                if (clamped.length === 44 && digitsBeforeCursor >= 44) {
                    newPos = masked.length;
                }
                dom.inputChave.setSelectionRange(newPos, newPos);
            }

            // Update counter
            const count = clamped.length;
            dom.digitCount.textContent = count;

            dom.digitCounter.classList.remove('digit-counter--incomplete', 'digit-counter--complete');
            dom.inputChave.classList.remove('input--chave--error', 'input--chave--valid');

            if (count === 44) {
                dom.digitCounter.classList.add('digit-counter--complete');
                dom.inputChave.classList.add('input--chave--valid');
            } else if (count > 0) {
                dom.digitCounter.classList.add('digit-counter--incomplete');
            } else {
                dom.digitCounter.classList.add('digit-counter--incomplete');
            }

            // Enable/disable consult button
            dom.btnConsultar.disabled = (count !== 44);

            // Update counter icon
            const icon = dom.digitCounter.querySelector('i');
            if (count === 44) {
                icon.className = 'fa-solid fa-circle-check';
            } else {
                icon.className = 'fa-solid fa-circle-exclamation';
            }
        }

        dom.inputChave.addEventListener('input', updateChaveInput);
        dom.inputChave.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text');
            const digits = onlyDigits(pasted).substring(0, 44);
            dom.inputChave.value = digits;
            updateChaveInput();
        });
        dom.inputChave.addEventListener('keydown', (e) => {
            // Allow: backspace, delete, arrows, tab, escape, enter, home, end
            const allowed = [8, 46, 37, 38, 39, 40, 9, 27, 13, 35, 36];
            if (allowed.includes(e.keyCode)) return;
            // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) return;
            // Block non-digit keys
            if (!/^\d$/.test(e.key)) {
                e.preventDefault();
            }
        });

        // =====================================================
        // CAMERA BARCODE SCANNER
        // =====================================================
        function openCameraModal(context) {
            state.scanContext = context || 'consulta';
            dom.cameraModal.classList.add('modal--visible');
            startCamera();
        }

        function closeCameraModal() {
            stopCamera();
            dom.cameraModal.classList.remove('modal--visible');
        }

        async function startCamera() {
            dom.cameraStatus.textContent = 'Iniciando câmera...';
            dom.cameraStatus.style.color = 'var(--color-text-secondary)';

            await stopCamera();

            if (typeof Quagga === 'undefined') {
                dom.cameraStatus.textContent = 'Biblioteca Quagga2 não carregada.';
                dom.cameraStatus.style.color = 'var(--color-error)';
                showToast('Erro: biblioteca de scanner não carregada.', 'error');
                return;
            }

            try {
                Quagga.init({
                    inputStream: {
                        name: 'Live',
                        type: 'LiveStream',
                        target: document.getElementById('camera-reader'),
                        constraints: {
                            facingMode: state.cameraFacingMode,
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                        },
                    },
                    decoder: {
                        readers: ['code_128_reader', 'code_39_reader'],
                    },
                    locator: {
                        patchSize: 'medium',
                        halfSample: true,
                    },
                    numOfWorkers: navigator.hardwareConcurrency ? Math.min(navigator.hardwareConcurrency, 4) : 2,
                    frequency: 10,
                }, (err) => {
                    if (err) {
                        console.error('Quagga init error:', err);
                        state.isCameraActive = false;
                        dom.cameraStatus.textContent = 'Erro ao inicializar a câmera. Tente novamente.';
                        dom.cameraStatus.style.color = 'var(--color-error)';
                        showToast('Erro ao iniciar a câmera: ' + (err.message || err), 'error');
                        return;
                    }

                    Quagga.start();
                    state.isCameraActive = true;
                    setTimeout(() => applyZoom(state.zoomLevel), 800);
                    dom.cameraStatus.textContent = 'Aproxime o código de barras horizontalmente na área de leitura';
                    dom.cameraStatus.style.color = 'var(--color-text-secondary)';
                });

                Quagga.onDetected((result) => {
                    if (result && result.codeResult && result.codeResult.code) {
                        onScanSuccess(result.codeResult.code);
                    }
                });

                Quagga.onProcessed((result) => {
                    // Canvas overlay for visual feedback
                    if (result && result.boxes) {
                        const drawingCtx = Quagga.canvas.ctx.overlay;
                        const drawingCanvas = Quagga.canvas.dom.overlay;
                        if (drawingCtx && drawingCanvas) {
                            drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                        }
                    }
                });

            } catch (err) {
                console.error('Camera error:', err);
                state.isCameraActive = false;
                if (err.message && err.message.includes('permission')) {
                    dom.cameraStatus.textContent = 'Permissão de câmera negada. Verifique as configurações do navegador.';
                    showToast('Permissão de câmera negada. Verifique as configurações do navegador.', 'error');
                } else if (err.message && err.message.includes('NotReadableError')) {
                    dom.cameraStatus.textContent = 'Câmera em uso por outro aplicativo. Feche outros apps e tente novamente.';
                    showToast('Câmera indisponível. Feche outros aplicativos que possam estar usando a câmera.', 'warning');
                } else {
                    dom.cameraStatus.textContent = 'Erro ao acessar a câmera. Tente novamente.';
                    showToast('Erro ao acessar a câmera: ' + (err.message || 'Erro desconhecido'), 'error');
                }
                dom.cameraStatus.style.color = 'var(--color-error)';
            }
        }

        function onScanSuccess(decodedText) {
            const digits = onlyDigits(decodedText);
            if (digits.length === 44) {
                // Stop scanning immediately to prevent duplicate detections
                stopCamera();

                // Play beep sound
                try {
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.frequency.value = 800;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                    osc.start(audioCtx.currentTime);
                    osc.stop(audioCtx.currentTime + 0.2);
                } catch (_) {}

                if (state.scanContext === 'upload') {
                    const formatted = formatChave(digits);
                    dom.scannedKeyText.textContent = formatted;
                    dom.scannedKeyDisplay.style.display = 'flex';
                    navigator.clipboard.writeText(digits).then(() => {
                        showToast('Chave copiada para a área de transferência!', 'success', 3000);
                    }).catch(() => {
                        showToast('Chave de acesso capturada! (não foi possível copiar automaticamente)', 'warning', 4000);
                    });
                    dom.cameraStatus.textContent = '✅ Código lido e copiado!';
                } else {
                    dom.inputChave.value = digits;
                    updateChaveInput();
                    showToast('Chave de acesso capturada com sucesso!', 'success', 3000);
                    dom.cameraStatus.textContent = '✅ Código lido com sucesso!';
                }

                dom.cameraStatus.style.color = 'var(--color-success)';
                setTimeout(() => closeCameraModal(), 800);
            } else if (digits.length > 0) {
                dom.cameraStatus.textContent = `Código lido com ${digits.length} dígitos (esperado: 44). Tente novamente.`;
                dom.cameraStatus.style.color = 'var(--color-warning)';
            }
        }

        function stopCamera() {
            if (state.isCameraActive) {
                try { Quagga.stop(); } catch (_) {}
            }
            state.isCameraActive = false;
            applyZoom(1);
            dom.zoomSlider.value = 1;
            dom.zoomValue.textContent = '1.0×';
        }

        function applyZoom(level) {
            state.zoomLevel = level;
            const video = document.querySelector('#camera-reader video');
            if (video) {
                video.style.transform = `scale(${level})`;
                video.style.transformOrigin = 'center center';
            }
        }

        async function toggleCamera() {
            state.cameraFacingMode = state.cameraFacingMode === 'environment' ? 'user' : 'environment';
            await stopCamera();
            // Small delay before restarting
            setTimeout(() => startCamera(), 300);
        }

        async function retryCamera() {
            await stopCamera();
            setTimeout(() => startCamera(), 300);
        }

        dom.btnScan.addEventListener('click', () => openCameraModal('consulta'));
        dom.btnScanUpload.addEventListener('click', () => openCameraModal('upload'));
        dom.btnCopyKey.addEventListener('click', () => {
            const digits = onlyDigits(dom.scannedKeyText.textContent);
            if (digits.length === 44) {
                navigator.clipboard.writeText(digits).then(() => {
                    showToast('Chave copiada!', 'success', 2000);
                }).catch(() => {
                    showToast('Erro ao copiar. Selecione e copie manualmente.', 'warning');
                });
            }
        });
        dom.btnCloseCamera.addEventListener('click', closeCameraModal);
        dom.modalBackdrop.addEventListener('click', closeCameraModal);
        dom.btnToggleCamera.addEventListener('click', toggleCamera);
        dom.btnRetryCamera.addEventListener('click', retryCamera);
        dom.zoomSlider.addEventListener('input', () => {
            const level = parseFloat(dom.zoomSlider.value);
            dom.zoomValue.textContent = level.toFixed(1) + '×';
            applyZoom(level);
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dom.cameraModal.classList.contains('modal--visible')) {
                closeCameraModal();
            }
        });

        // =====================================================
        // API INTEGRATION (meudanfe.com.br)
        // =====================================================
        // PHP proxy on same server — avoids CORS entirely
        const API_URL = 'proxy.php';

        async function consultarAPI() {
            if (state.accessKey.length !== 44) {
                showToast('A chave de acesso deve ter exatamente 44 dígitos.', 'warning');
                dom.inputChave.classList.add('input--chave--error');
                setTimeout(() => dom.inputChave.classList.remove('input--chave--error'), 500);
                return;
            }

            dom.fallbackApi.classList.remove('fallback-box--visible');
            showLoading(t('loadingConsultar'));

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chave: state.accessKey }),
                });

                if (!response.ok) {
                    const errorText = await response.text().catch(() => '');
                    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
                }

                const data = await response.json();

                if (!data.pdf_base64) {
                    throw new Error('Resposta da API não contém pdf_base64');
                }

                // Convert base64 to blob
                const binaryStr = atob(data.pdf_base64);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'application/pdf' });

                // Display PDF
                displayPdf(blob, `DANFE_${state.accessKey}.pdf`);
                showToast('DANFE gerado com sucesso via API!', 'success');

            } catch (err) {
                console.error('API error:', err);

                // Detect CORS or network errors
                if (err.name === 'TypeError' || err.message.includes('NetworkError') ||
                    err.message.includes('Failed to fetch') || err.message.includes('CORS')) {
                    dom.fallbackApi.classList.add('fallback-box--visible');
                    showToast('Não foi possível acessar a API (possível bloqueio CORS). Veja as alternativas abaixo.', 'warning', 8000);
                } else {
                    showToast(`Erro na consulta: ${err.message}`, 'error');
                }
            } finally {
                hideLoading();
            }
        }

        dom.btnConsultar.addEventListener('click', consultarAPI);

        // Also allow Enter key on the input
        dom.inputChave.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && state.accessKey.length === 44) {
                e.preventDefault();
                consultarAPI();
            }
        });

        // =====================================================
        // DRAG & DROP + FILE INPUT (XML Upload)
        // =====================================================
        function handleXmlFile(file) {
            if (!file) return;

            if (!file.name.toLowerCase().endsWith('.xml') && file.type !== 'text/xml' && file.type !== 'application/xml') {
                showToast('Por favor, selecione um arquivo .xml válido.', 'warning');
                return;
            }

            state.selectedXmlFile = file;
            dom.fileName.textContent = file.name;
            dom.fileInfo.classList.add('drop-zone__file-info--visible');
            dom.btnGeneratePdf.disabled = false;
        }

        // Drag events
        dom.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dom.dropZone.classList.add('drop-zone--dragover');
        });

        dom.dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dom.dropZone.classList.remove('drop-zone--dragover');
        });

        dom.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dom.dropZone.classList.remove('drop-zone--dragover');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleXmlFile(files[0]);
            }
        });

        dom.dropZone.addEventListener('click', () => {
            dom.fileInput.click();
        });

        dom.dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                dom.fileInput.click();
            }
        });

        dom.btnSelectFile.addEventListener('click', () => {
            dom.fileInput.click();
        });

        // Help section toggle
        dom.btnHelpToggle.addEventListener('click', () => {
            const isOpen = dom.btnHelpToggle.getAttribute('aria-expanded') === 'true';
            dom.btnHelpToggle.setAttribute('aria-expanded', !isOpen);
            dom.helpContent.classList.toggle('help-section__content--open', !isOpen);
        });

        dom.fileInput.addEventListener('change', () => {
            if (dom.fileInput.files.length > 0) {
                handleXmlFile(dom.fileInput.files[0]);
            }
        });

        // =====================================================
        // XML PARSER (NFe data extraction)
        // =====================================================
        const NFE_NS = 'http://www.portalfiscal.inf.br/nfe';

        function parseNFeXML(xmlString) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlString, 'text/xml');

            // Check for parse errors
            const parseError = doc.querySelector('parsererror');
            if (parseError) {
                throw new Error('Arquivo XML inválido ou mal formatado.');
            }

            // Try to find NFe node (may be root or inside nfeProc)
            let nfeNode = doc.getElementsByTagNameNS(NFE_NS, 'NFe')[0];
            if (!nfeNode) nfeNode = doc.getElementsByTagName('NFe')[0];

            if (!nfeNode) {
                throw new Error('Arquivo XML não contém uma NFe válida. Verifique se é um XML de Nota Fiscal Eletrônica.');
            }

            let infNFe = nfeNode.getElementsByTagNameNS(NFE_NS, 'infNFe')[0];
            if (!infNFe) infNFe = nfeNode.getElementsByTagName('infNFe')[0];

            if (!infNFe) {
                throw new Error('Estrutura da NFe não encontrada no XML (infNFe ausente).');
            }

            // Helper: get element text content
            const get = (parent, tag) => xmlText(parent, tag, NFE_NS);

            // --- Identificação (ide) ---
            const ide = infNFe.getElementsByTagNameNS(NFE_NS, 'ide')[0] || infNFe.getElementsByTagName('ide')[0] || {};

            // --- Emitente (emit) ---
            const emit = infNFe.getElementsByTagNameNS(NFE_NS, 'emit')[0] || infNFe.getElementsByTagName('emit')[0] || {};
            const enderEmit = emit.getElementsByTagNameNS(NFE_NS, 'enderEmit')[0] || emit.getElementsByTagName('enderEmit')[0] || {};

            // --- Destinatário (dest) ---
            const dest = infNFe.getElementsByTagNameNS(NFE_NS, 'dest')[0] || infNFe.getElementsByTagName('dest')[0] || {};
            const enderDest = dest.getElementsByTagNameNS(NFE_NS, 'enderDest')[0] || dest.getElementsByTagName('enderDest')[0] || {};

            // --- Produtos (det) ---
            const detList = infNFe.getElementsByTagNameNS(NFE_NS, 'det');
            const produtos = [];
            for (let i = 0; i < detList.length; i++) {
                const det = detList[i];
                const prod = det.getElementsByTagNameNS(NFE_NS, 'prod')[0] || det.getElementsByTagName('prod')[0] || {};
                const imposto = det.getElementsByTagNameNS(NFE_NS, 'imposto')[0] || det.getElementsByTagName('imposto')[0] || {};

                // ICMS
                const icmsNode = imposto.getElementsByTagNameNS(NFE_NS, 'ICMS')[0] || imposto.getElementsByTagName('ICMS')[0] || {};
                const icmsChild = icmsNode.firstElementChild || {};
                const icmsTag = icmsChild.localName || '';
                const isICMSSN = icmsTag.includes('ICMSSN');

                // IPI
                const ipiNode = imposto.getElementsByTagNameNS(NFE_NS, 'IPI')[0] || imposto.getElementsByTagName('IPI')[0] || {};
                const ipiChild = (ipiNode.getElementsByTagNameNS(NFE_NS, 'IPITrib')[0] || ipiNode.getElementsByTagName('IPITrib')[0] ||
                                  ipiNode.getElementsByTagNameNS(NFE_NS, 'IPINT')[0] || ipiNode.getElementsByTagName('IPINT')[0] || {});

                produtos.push({
                    nItem: get(det, 'nItem'),
                    cProd: get(prod, 'cProd'),
                    xProd: get(prod, 'xProd'),
                    NCM: get(prod, 'NCM'),
                    CFOP: get(prod, 'CFOP'),
                    uCom: get(prod, 'uCom'),
                    qCom: get(prod, 'qCom'),
                    vUnCom: get(prod, 'vUnCom'),
                    vProd: get(prod, 'vProd'),
                    // ICMS
                    vBC: isICMSSN ? '' : get(icmsChild, 'vBC'),
                    vICMS: isICMSSN ? '' : get(icmsChild, 'vICMS'),
                    pICMS: isICMSSN ? '' : get(icmsChild, 'pICMS'),
                    // IPI
                    vIPI: get(ipiChild, 'vIPI'),
                    pIPI: get(ipiChild, 'pIPI'),
                });
            }

            // --- Totais (total) ---
            const total = infNFe.getElementsByTagNameNS(NFE_NS, 'total')[0] || infNFe.getElementsByTagName('total')[0] || {};
            const icmsTot = total.getElementsByTagNameNS(NFE_NS, 'ICMSTot')[0] || total.getElementsByTagName('ICMSTot')[0] || {};

            // --- Transporte (transp) ---
            const transp = infNFe.getElementsByTagNameNS(NFE_NS, 'transp')[0] || infNFe.getElementsByTagName('transp')[0] || {};
            const transporta = transp.getElementsByTagNameNS(NFE_NS, 'transporta')[0] || transp.getElementsByTagName('transporta')[0] || {};

            // --- Informações Adicionais ---
            const infAdic = infNFe.getElementsByTagNameNS(NFE_NS, 'infAdic')[0] || infNFe.getElementsByTagName('infAdic')[0] || {};

            // --- Protocolo ---
            let nProt = '';
            let dhRecbto = '';
            const protNFe = doc.getElementsByTagNameNS(NFE_NS, 'protNFe')[0] || doc.getElementsByTagName('protNFe')[0];
            if (protNFe) {
                const infProt = protNFe.getElementsByTagNameNS(NFE_NS, 'infProt')[0] || protNFe.getElementsByTagName('infProt')[0] || {};
                nProt = get(infProt, 'nProt');
                dhRecbto = get(infProt, 'dhRecbto');
            }

            // --- Chave de Acesso ---
            // Id is an attribute of <infNFe>, not a child element — use getAttribute()
            // Fallback: <chNFe> (canonical NFe field name), not <chave>
            const chaveId = infNFe.getAttribute('Id') || '';
            const chaveAcesso = chaveId.replace('NFe', '').trim() || get(infNFe, 'chNFe', NFE_NS);

            // --- Natureza da Operação ---
            const natOp = get(ide, 'natOp');

            // --- Tipo de operação (0=entrada, 1=saída) ---
            const tpNF = get(ide, 'tpNF');
            const tpNFDesc = tpNF === '0' ? 'Entrada' : tpNF === '1' ? 'Saída' : '—';

            // --- Número e Série ---
            const nNF = get(ide, 'nNF');
            const serie = get(ide, 'serie');

            // --- Data de Emissão ---
            const dhEmi = get(ide, 'dhEmi');

            // --- Modalidade do Frete ---
            const modFrete = get(transp, 'modFrete');
            const modFreteDesc = {
                '0': '0 - Emitente',
                '1': '1 - Destinatário',
                '2': '2 - Terceiros',
                '3': '3 - Próprio Remetente',
                '4': '4 - Próprio Destinatário',
                '9': '9 - Sem Frete',
            }[modFrete] || (modFrete || '—');

            // Build result object
            return {
                // Identificação
                chaveAcesso,
                nNF,
                serie,
                dhEmi,
                tpNF,
                tpNFDesc,
                natOp,
                nProt,
                dhRecbto,

                // Emitente
                emit: {
                    xNome: get(emit, 'xNome'),
                    xFant: get(emit, 'xFant'),
                    CNPJ: get(emit, 'CNPJ'),
                    IE: get(emit, 'IE'),
                    xLgr: get(enderEmit, 'xLgr'),
                    nro: get(enderEmit, 'nro'),
                    xBairro: get(enderEmit, 'xBairro'),
                    xMun: get(enderEmit, 'xMun'),
                    UF: get(enderEmit, 'UF'),
                    CEP: get(enderEmit, 'CEP'),
                    fone: get(enderEmit, 'fone'),
                },

                // Destinatário
                dest: {
                    xNome: get(dest, 'xNome'),
                    CNPJ: get(dest, 'CNPJ') || get(dest, 'CPF'),
                    IE: get(dest, 'IE'),
                    xLgr: get(enderDest, 'xLgr'),
                    nro: get(enderDest, 'nro'),
                    xBairro: get(enderDest, 'xBairro'),
                    xMun: get(enderDest, 'xMun'),
                    UF: get(enderDest, 'UF'),
                    CEP: get(enderDest, 'CEP'),
                },

                // Produtos
                produtos,

                // Totais
                totais: {
                    vBC: get(icmsTot, 'vBC'),
                    vICMS: get(icmsTot, 'vICMS'),
                    vBCST: get(icmsTot, 'vBCST'),
                    vST: get(icmsTot, 'vST'),
                    vProd: get(icmsTot, 'vProd'),
                    vFrete: get(icmsTot, 'vFrete'),
                    vSeg: get(icmsTot, 'vSeg'),
                    vDesc: get(icmsTot, 'vDesc'),
                    vOutro: get(icmsTot, 'vOutro'),
                    vIPI: get(icmsTot, 'vIPI'),
                    vNF: get(icmsTot, 'vNF'),
                },

                // Transporte
                transporte: {
                    modFrete: modFreteDesc,
                    xNome: get(transporta, 'xNome'),
                    CNPJ: get(transporta, 'CNPJ') || get(transporta, 'CPF'),
                    placa: get(transporta, 'placa'),
                    UF: get(transporta, 'UF'),
                    xEnder: get(transporta, 'xEnder'),
                    xMun: get(transporta, 'xMun'),
                },

                // Informações adicionais
                infCpl: get(infAdic, 'infCpl'),
                infAdFisco: get(infAdic, 'infAdFisco'),
            };
        }

        // =====================================================
        // DANFE PDF GENERATOR (pdfmake — Official Layout)
        // =====================================================
        function generateDANFE(data) {
            // Helper: thin border cell
            const border = [0.5, 0.5, 0.5, 0.5];
            const noBorder = [0, 0, 0, 0];
            const borderBottom = [0, 0, 0.5, 0];

            function cell(text, opts = {}) {
                return {
                    text: text || '—',
                    fontSize: opts.fontSize || 7,
                    bold: opts.bold || false,
                    alignment: opts.alignment || 'left',
                    margin: opts.margin || [2, 1, 2, 1],
                    border: opts.border !== undefined ? opts.border : border,
                    fillColor: opts.fillColor || null,
                    colSpan: opts.colSpan || 1,
                    rowSpan: opts.rowSpan || 1,
                };
            }

            function headerCell(text, opts = {}) {
                return cell(text, { ...opts, bold: true, fillColor: '#f0f0f0', fontSize: opts.fontSize || 7 });
            }

            function titleCell(text, opts = {}) {
                return cell(text, { ...opts, bold: true, fontSize: opts.fontSize || 8, fillColor: '#e8e8e8' });
            }

            // ---- Build product table rows ----
            const productHeader = [
                headerCell('CÓD', { fontSize: 6, alignment: 'center' }),
                headerCell('DESCRIÇÃO DO PRODUTO/SERVIÇO', { fontSize: 6 }),
                headerCell('NCM/SH', { fontSize: 6, alignment: 'center' }),
                headerCell('CFOP', { fontSize: 6, alignment: 'center' }),
                headerCell('UN', { fontSize: 6, alignment: 'center' }),
                headerCell('QTD', { fontSize: 6, alignment: 'right' }),
                headerCell('VL UNIT', { fontSize: 6, alignment: 'right' }),
                headerCell('VL TOTAL', { fontSize: 6, alignment: 'right' }),
                headerCell('BC ICMS', { fontSize: 6, alignment: 'right' }),
                headerCell('VL ICMS', { fontSize: 6, alignment: 'right' }),
                headerCell('IPI', { fontSize: 6, alignment: 'right' }),
                headerCell('ALÍQ', { fontSize: 6, alignment: 'center' }),
            ];

            const productRows = data.produtos.map((p, idx) => [
                cell(p.cProd || (idx + 1).toString(), { fontSize: 6.5, alignment: 'center' }),
                cell(p.xProd, { fontSize: 6.5 }),
                cell(p.NCM, { fontSize: 6.5, alignment: 'center' }),
                cell(p.CFOP, { fontSize: 6.5, alignment: 'center' }),
                cell(p.uCom, { fontSize: 6.5, alignment: 'center' }),
                cell(formatCurrency(p.qCom), { fontSize: 6.5, alignment: 'right' }),
                cell(formatCurrency(p.vUnCom), { fontSize: 6.5, alignment: 'right' }),
                cell(formatCurrency(p.vProd), { fontSize: 6.5, alignment: 'right' }),
                cell(formatCurrency(p.vBC), { fontSize: 6.5, alignment: 'right' }),
                cell(formatCurrency(p.vICMS), { fontSize: 6.5, alignment: 'right' }),
                cell(formatCurrency(p.vIPI), { fontSize: 6.5, alignment: 'right' }),
                cell(p.pICMS ? `${p.pICMS}%` : '—', { fontSize: 6.5, alignment: 'center' }),
            ]);

            // ---- Build document definition ----
            const docDef = {
                pageSize: 'A4',
                pageOrientation: 'portrait',
                pageMargins: [15, 15, 15, 15],

                content: [
                    // ===== HEADER =====
                    {
                        table: {
                            widths: ['*', 'auto'],
                            body: [
                                [
                                    {
                                        stack: [
                                            { text: 'DANFE', fontSize: 14, bold: true, margin: [0, 0, 0, 2] },
                                            { text: 'Documento Auxiliar da Nota Fiscal Eletrônica', fontSize: 7, color: '#555' },
                                        ],
                                        border: noBorder,
                                        margin: [4, 4, 4, 4],
                                    },
                                    {
                                        stack: [
                                            { text: `${data.tpNFDesc} - Nº ${data.nNF || '—'}`, fontSize: 9, bold: true, alignment: 'right' },
                                            { text: `Série: ${data.serie || '—'}`, fontSize: 7, alignment: 'right' },
                                            { text: `Folha: 1/1`, fontSize: 7, alignment: 'right' },
                                        ],
                                        border: noBorder,
                                        margin: [4, 4, 4, 4],
                                    },
                                ],
                            ],
                        },
                        layout: { defaultBorder: [0.5, 0.5, 0.5, 0.5] },
                        margin: [0, 0, 0, 0],
                    },

                    // ===== CONTROLE DO FISCO (empty) =====
                    {
                        table: {
                            widths: ['*'],
                            body: [[ cell('CONTROLE DO FISCO', { bold: true, fontSize: 7, alignment: 'center' }) ]],
                        },
                        margin: [0, 2, 0, 0],
                    },

                    // ===== QUADRO A — EMITENTE =====
                    {
                        table: {
                            widths: ['*'],
                            body: [[ titleCell('A — IDENTIFICAÇÃO DO EMITENTE', { fontSize: 7 }) ]],
                        },
                        margin: [0, 4, 0, 0],
                    },
                    {
                        table: {
                            widths: ['*'],
                            body: [[ cell(data.emit.xNome, { bold: true, fontSize: 9 }) ]],
                        },
                        margin: [0, 0, 0, 0],
                    },
                    {
                        table: {
                            widths: ['*', '*', '*'],
                            body: [[
                                cell(`CNPJ: ${formatCNPJ(data.emit.CNPJ)}`, { fontSize: 7 }),
                                cell(`Insc. Estadual: ${data.emit.IE || '—'}`, { fontSize: 7 }),
                                cell(`Data Emissão: ${formatDateTime(data.dhEmi)}`, { fontSize: 7 }),
                            ]],
                        },
                        margin: [0, 0, 0, 0],
                    },
                    {
                        table: {
                            widths: ['*'],
                            body: [[
                                cell(`Endereço: ${data.emit.xLgr || ''}, ${data.emit.nro || ''} — ${data.emit.xBairro || ''} — CEP: ${data.emit.CEP || ''} — ${data.emit.xMun || ''} - ${data.emit.UF || ''}${data.emit.fone ? ' — Fone: ' + data.emit.fone : ''}`, { fontSize: 7 })
                            ]],
                        },
                        margin: [0, 0, 0, 4],
                    },

                    // ===== QUADRO B — DESTINATÁRIO =====
                    {
                        table: {
                            widths: ['*'],
                            body: [[ titleCell('B — DESTINATÁRIO / REMETENTE', { fontSize: 7 }) ]],
                        },
                        margin: [0, 0, 0, 0],
                    },
                    {
                        table: {
                            widths: ['*'],
                            body: [[ cell(data.dest.xNome, { bold: true, fontSize: 9 }) ]],
                        },
                        margin: [0, 0, 0, 0],
                    },
                    {
                        table: {
                            widths: ['*', '*', '*'],
                            body: [[
                                cell(`CNPJ/CPF: ${formatCNPJ(data.dest.CNPJ) || formatCPF(data.dest.CNPJ)}`, { fontSize: 7 }),
                                cell(`Insc. Estadual: ${data.dest.IE || '—'}`, { fontSize: 7 }),
                                cell(`Data Entrada/Saída: ${formatDateTime(data.dhEmi)}`, { fontSize: 7 }),
                            ]],
                        },
                        margin: [0, 0, 0, 0],
                    },
                    {
                        table: {
                            widths: ['*'],
                            body: [[
                                cell(`Endereço: ${data.dest.xLgr || ''}, ${data.dest.nro || ''} — ${data.dest.xBairro || ''} — CEP: ${data.dest.CEP || ''} — ${data.dest.xMun || ''} - ${data.dest.UF || ''}`, { fontSize: 7 })
                            ]],
                        },
                        margin: [0, 0, 0, 4],
                    },

                    // ===== QUADRO C — FISCO / PROTOCOLO =====
                    {
                        table: {
                            widths: ['*', '*'],
                            body: [[
                                {
                                    stack: [
                                        titleCell('C — NATUREZA DA OPERAÇÃO / PROTOCOLO', { fontSize: 7 }),
                                        cell(`Natureza: ${data.natOp || '—'}`, { fontSize: 7 }),
                                    ],
                                    border: border,
                                },
                                {
                                    stack: [
                                        { text: 'PROTOCOLO DE AUTORIZAÇÃO DE USO', fontSize: 7, bold: true, fillColor: '#e8e8e8', border: [0.5, 0.5, 0.5, 0], margin: [2, 1, 2, 1] },
                                        cell(data.nProt || '—', { fontSize: 8, bold: true, alignment: 'center' }),
                                        cell(data.dhRecbto ? `Data: ${formatDateTime(data.dhRecbto)}` : '', { fontSize: 6.5, alignment: 'center' }),
                                    ],
                                    border: border,
                                },
                            ]],
                        },
                        margin: [0, 0, 0, 4],
                    },

                    // ===== QUADRO D — PRODUTOS/SERVIÇOS =====
                    {
                        table: {
                            widths: ['*'],
                            body: [[ titleCell('D — DADOS DOS PRODUTOS / SERVIÇOS', { fontSize: 7 }) ]],
                        },
                        margin: [0, 0, 0, 0],
                    },
                    {
                        table: {
                            widths: [28, '*', 38, 28, 20, 38, 42, 42, 42, 42, 38, 28],
                            headerRows: 1,
                            body: [productHeader, ...productRows],
                        },
                        layout: { defaultBorder: [0.5, 0.5, 0.5, 0.5] },
                        margin: [0, 0, 0, 4],
                    },

                    // ===== QUADRO E — CÁLCULO DO IMPOSTO =====
                    {
                        table: {
                            widths: ['*'],
                            body: [[ titleCell('E — CÁLCULO DO IMPOSTO', { fontSize: 7 }) ]],
                        },
                        margin: [0, 0, 0, 0],
                    },
                    {
                        table: {
                            widths: ['*', '*', '*', '*'],
                            body: [
                                [
                                    cell(`Base de Cálculo ICMS: ${formatCurrency(data.totais.vBC)}`, { fontSize: 7 }),
                                    cell(`Valor do ICMS: ${formatCurrency(data.totais.vICMS)}`, { fontSize: 7 }),
                                    cell(`Base de Cálc. ICMS ST: ${formatCurrency(data.totais.vBCST)}`, { fontSize: 7 }),
                                    cell(`Valor do ICMS ST: ${formatCurrency(data.totais.vST)}`, { fontSize: 7 }),
                                ],
                                [
                                    cell(`Valor Total dos Produtos: ${formatCurrency(data.totais.vProd)}`, { fontSize: 7 }),
                                    cell(`Valor do Frete: ${formatCurrency(data.totais.vFrete)}`, { fontSize: 7 }),
                                    cell(`Valor do Seguro: ${formatCurrency(data.totais.vSeg)}`, { fontSize: 7 }),
                                    cell(`Desconto: ${formatCurrency(data.totais.vDesc)}`, { fontSize: 7 }),
                                ],
                                [
                                    cell(`Outras Despesas: ${formatCurrency(data.totais.vOutro)}`, { fontSize: 7 }),
                                    cell(`Valor do IPI: ${formatCurrency(data.totais.vIPI)}`, { fontSize: 7 }),
                                    { ...cell(`Valor Total da Nota: ${formatCurrency(data.totais.vNF)}`, { fontSize: 8, bold: true }), colSpan: 2 },
                                    {},
                                ],
                            ],
                        },
                        margin: [0, 0, 0, 4],
                    },

                    // ===== QUADRO F — TRANSPORTE =====
                    {
                        table: {
                            widths: ['*'],
                            body: [[ titleCell('F — TRANSPORTADOR / VOLUMES TRANSPORTADOS', { fontSize: 7 }) ]],
                        },
                        margin: [0, 0, 0, 0],
                    },
                    {
                        table: {
                            widths: ['*', '*', '*', '*', '*'],
                            body: [[
                                cell(`Transportadora: ${data.transporte.xNome || '—'}`, { fontSize: 7 }),
                                cell(`CNPJ/CPF: ${formatCNPJ(data.transporte.CNPJ) || formatCPF(data.transporte.CNPJ) || '—'}`, { fontSize: 7 }),
                                cell(`Placa: ${data.transporte.placa || '—'}`, { fontSize: 7 }),
                                cell(`UF: ${data.transporte.UF || '—'}`, { fontSize: 7, alignment: 'center' }),
                                cell(`Frete: ${data.transporte.modFrete || '—'}`, { fontSize: 7 }),
                            ]],
                        },
                        margin: [0, 0, 0, 0],
                    },
                    {
                        table: {
                            widths: ['*'],
                            body: [[ cell(`Endereço: ${data.transporte.xEnder || ''} — ${data.transporte.xMun || ''} — ${data.transporte.UF || ''}`, { fontSize: 7 }) ]],
                        },
                        margin: [0, 0, 0, 4],
                    },

                    // ===== QUADRO G — DADOS ADICIONAIS =====
                    {
                        table: {
                            widths: ['*'],
                            body: [[ titleCell('G — DADOS ADICIONAIS', { fontSize: 7 }) ]],
                        },
                        margin: [0, 0, 0, 0],
                    },
                    {
                        table: {
                            widths: ['*', '*'],
                            body: [[
                                {
                                    stack: [
                                        { text: 'Informações Complementares', fontSize: 7, bold: true, margin: [2, 1, 2, 2] },
                                        cell(data.infCpl || '—', { fontSize: 6.5, border: noBorder }),
                                    ],
                                    border: border,
                                },
                                {
                                    stack: [
                                        { text: 'Reservado ao Fisco', fontSize: 7, bold: true, margin: [2, 1, 2, 2] },
                                        cell(data.infAdFisco || '—', { fontSize: 6.5, border: noBorder }),
                                    ],
                                    border: border,
                                },
                            ]],
                        },
                        margin: [0, 0, 0, 4],
                    },

                    // ===== QUADRO H — CHAVE DE ACESSO =====
                    {
                        table: {
                            widths: ['*'],
                            body: [[ titleCell('H — CHAVE DE ACESSO / CÓDIGO DE BARRAS', { fontSize: 7 }) ]],
                        },
                        margin: [0, 0, 0, 0],
                    },
                    {
                        table: {
                            widths: ['*'],
                            body: [[ cell(`Chave de Acesso: ${formatChave(data.chaveAcesso || '')}`, { fontSize: 8, bold: true, alignment: 'center', font: 'Courier' }) ]],
                        },
                        margin: [0, 0, 0, 0],
                    },
                    {
                        table: {
                            widths: ['*'],
                            body: [[ cell('Consulta de autenticidade no portal da NF-e: www.nfe.fazenda.gov.br', { fontSize: 6.5, alignment: 'center', border: noBorder }) ]],
                        },
                        margin: [0, 2, 0, 0],
                    },
                ],

                styles: {
                    header: { fontSize: 7, bold: true, fillColor: '#f0f0f0' },
                },

                defaultStyle: {
                    font: 'Roboto',
                    fontSize: 7,
                },
            };

            return docDef;
        }

        // =====================================================
        // PDF VIEWER & DOWNLOAD
        // =====================================================
        function displayPdf(blob, filename) {
            // Revoke previous blob URL
            if (state.currentPdfUrl) {
                URL.revokeObjectURL(state.currentPdfUrl);
            }

            state.pdfBlob = blob;
            state.currentPdfUrl = URL.createObjectURL(blob);

            // Show compact download bar (no iframe)
            dom.downloadFilename.textContent = filename || 'DANFE.pdf';
            dom.pdfSection.classList.add('pdf-section--visible');

            // Store filename for download
            dom.btnDownload.dataset.filename = filename || 'DANFE.pdf';

            // Scroll to download bar
            dom.pdfSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        dom.btnDownload.addEventListener('click', () => {
            if (!state.pdfBlob) {
                showToast('Nenhum PDF disponível para download.', 'warning');
                return;
            }

            const filename = dom.btnDownload.dataset.filename || 'DANFE.pdf';
            const url = URL.createObjectURL(state.pdfBlob);

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => URL.revokeObjectURL(url), 1000);
            showToast('Download iniciado!', 'success', 2000);
        });

        // =====================================================
        // XML FILE PROCESSING & PDF GENERATION
        // =====================================================
        async function processXmlAndGeneratePDF() {
            if (!state.selectedXmlFile) {
                showToast('Selecione um arquivo XML primeiro.', 'warning');
                return;
            }

            showLoading(t('loadingXmlRead'));

            try {
                // Read file
                const xmlString = await readFileAsText(state.selectedXmlFile);

                // Parse XML
                showLoading(t('loadingXmlProcess'));
                state.parsedNFeData = parseNFeXML(xmlString);

                // Generate PDF
                showLoading(t('loadingXmlGenerate'));
                const docDef = generateDANFE(state.parsedNFeData);

                // Use pdfmake to generate blob
                pdfMake.createPdf(docDef).getBlob((blob) => {
                    const chave = state.parsedNFeData.chaveAcesso || 'NFe';
                    const filename = `DANFE_${chave.substring(0, 10)}.pdf`;
                    displayPdf(blob, filename);
                    hideLoading();
                    showToast('DANFE gerado com sucesso!', 'success');
                });

            } catch (err) {
                console.error('XML processing error:', err);
                hideLoading();
                showToast(`Erro ao processar XML: ${err.message}`, 'error');
                state.selectedXmlFile = null;
                dom.btnGeneratePdf.disabled = true;
                dom.fileInfo.classList.remove('drop-zone__file-info--visible');
            }
        }

        function readFileAsText(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
                reader.readAsText(file, 'UTF-8');
            });
        }

        dom.btnGeneratePdf.addEventListener('click', processXmlAndGeneratePDF);

        // =====================================================
        // CNPJÁ API INTEGRATION (api.cnpja.com)
        // =====================================================
        const CNPJA_API_URL = 'cnpja-proxy.php';
        const CNPJA_HISTORY_KEY = 'danfe-cnpja-history';
        const CNPJA_HISTORY_MAX = 10;
        let cnpjaPersonRecords = [];

        // ----- Sub-tab switching -----
        function switchCnpjaSubtab(subtab) {
            state.cnpjaSubtab = subtab;

            dom.cnpjaSubtabBtns.forEach(btn => {
                const isActive = btn.dataset.cnpjaSubtab === subtab;
                btn.classList.toggle('cnpja-subtab--active', isActive);
                btn.setAttribute('aria-selected', isActive);
            });

            dom.cnpjaPanelEmpresa.classList.toggle('cnpja-subpanel--active', subtab === 'empresa');
            dom.cnpjaPanelSocios.classList.toggle('cnpja-subpanel--active', subtab === 'socios');
            renderCnpjaHistory();
        }

        dom.cnpjaSubtabBtns.forEach(btn => {
            btn.addEventListener('click', () => switchCnpjaSubtab(btn.dataset.cnpjaSubtab));
        });

        // ----- Flexible input handling (CNPJ/CPF or free text) -----
        function updateCnpjaEmpresaInput() {
            const value = dom.inputCnpjaEmpresa.value.trim();
            const digits = onlyDigits(value);
            const isCnpj = digits.length === 14 && value === digits;
            dom.btnConsultarEmpresa.disabled = !(isCnpj || value.length >= 2);
        }

        function updateCnpjaSocioInput() {
            const value = dom.inputCnpjaSocio.value.trim();
            const digits = onlyDigits(value);
            const isCpf = digits.length === 11 && value === digits;
            dom.btnConsultarSocios.disabled = !(isCpf || value.length >= 2);
        }

        dom.inputCnpjaEmpresa.addEventListener('input', updateCnpjaEmpresaInput);
        dom.inputCnpjaSocio.addEventListener('input', updateCnpjaSocioInput);

        // ----- Rendering helpers -----
        function cnpjaValue(value) {
            if (value === null || value === undefined || value === '') return '—';
            return String(value);
        }

        function cnpjaStatusText(data) {
            const s = data && data.status;
            if (!s) return '—';
            if (typeof s === 'string') return s;
            if (typeof s === 'object') return s.text || s.name || '—';
            return '—';
        }

        function cnpjaTextOf(value) {
            if (value === null || value === undefined || value === '') return '—';
            if (typeof value === 'object') return value.text || value.name || '—';
            return String(value);
        }

        function cnpjaAddress(data) {
            const a = (data && data.address) || {};
            const parts = [a.street, a.number, a.district, a.city || a.municipality, a.state]
                .filter(v => v !== null && v !== undefined && v !== '');
            if (a.zip) parts.push('CEP: ' + a.zip);
            return parts.length ? parts.join(' — ') : '—';
        }

        function formatTaxIdAny(value) {
            const digits = onlyDigits(String(value || ''));
            if (digits.length === 14) return formatCNPJ(digits);
            if (digits.length === 11) return formatCPF(digits);
            return cnpjaValue(value);
        }

        function cnpjaResultGrid(rows) {
            const items = rows.map(([label, value]) => `
                <div class="cnpja-result__item">
                    <span class="cnpja-result__label">${escapeHtml(label)}</span>
                    <span class="cnpja-result__value">${escapeHtml(cnpjaValue(value))}</span>
                </div>
            `).join('');
            return `<div class="cnpja-result__grid">${items}</div>`;
        }

        function cnpjaEmptyResult() {
            return `<div class="cnpja-result__empty"><i class="fa-solid fa-circle-info"></i> ${escapeHtml(t('cnpjaNoResults'))}</div>`;
        }

        // ----- Office rendering -----
        function renderOfficeResult(data) {
            if (!data || typeof data !== 'object') return cnpjaEmptyResult();
            if (Array.isArray(data.records)) return renderOfficeSearchResults(data);
            return renderOfficeDetail(data);
        }

        function renderOfficeSearchResults(data) {
            const records = Array.isArray(data.records) ? data.records : [];
            if (!records.length) return cnpjaEmptyResult();

            const items = records.map(rec => {
                const company = rec.company || {};
                const name = company.name || rec.alias || '';
                const alias = rec.alias || '';
                const taxId = rec.taxId || '';
                const status = cnpjaStatusText(rec);
                const meta = [
                    alias && alias !== name ? alias : '',
                    taxId ? formatCNPJ(String(taxId)) : '',
                    status !== '—' ? status : '',
                ].filter(Boolean).join(' · ');

                return `
                    <button class="cnpja-search-item" data-cnpja-office-taxid="${escapeHtml(taxId)}">
                        <span class="cnpja-search-item__avatar"><i class="fa-solid fa-building"></i></span>
                        <span class="cnpja-search-item__content">
                            <span class="cnpja-search-item__title">${escapeHtml(name || '—')}</span>
                            <span class="cnpja-search-item__meta">${escapeHtml(meta)}</span>
                        </span>
                        <i class="fa-solid fa-chevron-right cnpja-search-item__chevron"></i>
                    </button>
                `;
            }).join('');

            return `<h3 class="cnpja-result__subtitle"><i class="fa-solid fa-list"></i> ${escapeHtml(t('cnpjaResultsTitle'))}</h3>
                    <div class="cnpja-search-list">${items}</div>`;
        }

        function cnpjaStatusClass(text) {
            const s = String(text || '').toLowerCase();
            if (s.includes('ativa')) return 'cnpja-badge--success';
            if (s.includes('baixada') || s.includes('inapta') || s.includes('suspensa') || s.includes('nula')) return 'cnpja-badge--danger';
            return 'cnpja-badge--neutral';
        }

        function cnpjaInfoItem(label, value, icon) {
            return `<div class="cnpja-info-item">
                <span class="cnpja-info-item__icon"><i class="fa-solid ${icon}"></i></span>
                <span class="cnpja-info-item__content">
                    <span class="cnpja-info-item__label">${escapeHtml(label)}</span>
                    <span class="cnpja-info-item__value">${escapeHtml(cnpjaValue(value))}</span>
                </span>
            </div>`;
        }

        function renderOfficeDetail(data) {
            const company = data.company || {};
            const name = company.name || '';
            const alias = data.alias || '';
            const taxId = data.taxId || '';
            const founded = data.founded || '';
            const status = cnpjaStatusText(data);
            const mainActivity = cnpjaTextOf(data.mainActivity);
            const nature = cnpjaTextOf(company.nature);
            const size = cnpjaTextOf(company.size);
            const equity = company.equity;

            let html = `
                <div class="cnpja-hero">
                    <div class="cnpja-hero__main">
                        <h3 class="cnpja-hero__title">${escapeHtml(name || '—')}</h3>
                        ${alias ? `<p class="cnpja-hero__subtitle">${escapeHtml(alias)}</p>` : ''}
                        <div class="cnpja-hero__badges">
                            <span class="cnpja-badge cnpja-badge--status ${cnpjaStatusClass(status)}"><i class="fa-solid fa-circle"></i> ${escapeHtml(status)}</span>
                            <span class="cnpja-badge"><i class="fa-solid fa-barcode"></i> ${escapeHtml(formatCNPJ(String(taxId)))}</span>
                        </div>
                    </div>
                </div>
                <div class="cnpja-info-grid">
                    ${cnpjaInfoItem(t('cnpjaFieldFounded'), formatDate(founded), 'fa-calendar')}
                    ${cnpjaInfoItem(t('cnpjaFieldMainActivity'), mainActivity, 'fa-briefcase')}
                    ${cnpjaInfoItem(t('cnpjaFieldNature'), nature, 'fa-scale-balanced')}
                    ${cnpjaInfoItem(t('cnpjaFieldSize'), size, 'fa-chart-simple')}
                    ${cnpjaInfoItem(t('cnpjaFieldCapital'), formatCurrency(equity), 'fa-sack-dollar')}
                    ${cnpjaInfoItem(t('cnpjaFieldAddress'), cnpjaAddress(data), 'fa-location-dot')}
                </div>`;

            const members = Array.isArray(company.members) ? company.members : [];
            if (members.length) {
                html += `<h3 class="cnpja-result__subtitle"><i class="fa-solid fa-users"></i> ${escapeHtml(t('cnpjaPartnersTitle'))}</h3>
                         <div class="cnpja-members">${members.map(renderMemberCard).join('')}</div>`;
            }

            return html;
        }

        function renderPersonSearchResults(data) {
            const records = Array.isArray(data.records) ? data.records : [];
            if (!records.length) return cnpjaEmptyResult();

            cnpjaPersonRecords = records;

            const items = records.map(person => {
                const name = person.name || '';
                const taxId = person.taxId || '';
                const age = person.age;
                const meta = [
                    taxId ? formatTaxIdAny(taxId) : '',
                    age !== null && age !== undefined && age !== '' ? `${t('cnpjaFieldAge')}: ${cnpjaValue(age)}` : '',
                ].filter(Boolean).join(' · ');

                return `
                    <button class="cnpja-search-item" data-cnpja-person-id="${escapeHtml(person.id || '')}">
                        <span class="cnpja-search-item__avatar cnpja-search-item__avatar--person">${escapeHtml(initials(name))}</span>
                        <span class="cnpja-search-item__content">
                            <span class="cnpja-search-item__title">${escapeHtml(name || '—')}</span>
                            <span class="cnpja-search-item__meta">${escapeHtml(meta)}</span>
                        </span>
                        <i class="fa-solid fa-chevron-right cnpja-search-item__chevron"></i>
                    </button>
                `;
            }).join('');

            return `<h3 class="cnpja-result__subtitle"><i class="fa-solid fa-users"></i> ${escapeHtml(t('cnpjaResultsTitle'))}</h3>
                    <div class="cnpja-search-list">${items}</div>`;
        }

        function renderPersonDetail(data) {
            const name = data.name || '';
            const taxId = data.taxId || '';
            const age = data.age;

            let html = `
                <div class="cnpja-hero cnpja-hero--person">
                    <span class="cnpja-hero__avatar">${escapeHtml(initials(name))}</span>
                    <div class="cnpja-hero__main">
                        <h3 class="cnpja-hero__title">${escapeHtml(name || '—')}</h3>
                        <div class="cnpja-hero__badges">
                            <span class="cnpja-badge"><i class="fa-solid fa-id-card"></i> ${escapeHtml(formatTaxIdAny(taxId))}</span>
                            ${age !== null && age !== undefined && age !== '' ? `<span class="cnpja-badge"><i class="fa-solid fa-cake-candles"></i> ${escapeHtml(cnpjaValue(age))}</span>` : ''}
                        </div>
                    </div>
                </div>`;

            const membership = Array.isArray(data.membership) ? data.membership : [];
            if (membership.length) {
                html += `<h3 class="cnpja-result__subtitle"><i class="fa-solid fa-building"></i> ${escapeHtml(t('cnpjaCompanyListTitle'))}</h3>
                         <div class="cnpja-members">${membership.map(renderMembershipCard).join('')}</div>`;
            }

            return html;
        }

        function renderMemberCard(member) {
            const person = member.person || {};
            const personName = person.name || '';
            const personTaxId = person.taxId || '';
            const role = cnpjaTextOf(member.role);
            const since = member.since || '';

            return `<div class="cnpja-member">
                <span class="cnpja-member__avatar">${escapeHtml(initials(personName))}</span>
                <span class="cnpja-member__content">
                    <span class="cnpja-member__name">${escapeHtml(personName || '—')}</span>
                    <span class="cnpja-member__meta">
                        ${personTaxId ? `<span><i class="fa-solid fa-id-card"></i> ${escapeHtml(formatTaxIdAny(personTaxId))}</span>` : ''}
                        ${role !== '—' ? `<span><i class="fa-solid fa-user-tie"></i> ${escapeHtml(role)}</span>` : ''}
                        ${since ? `<span><i class="fa-solid fa-calendar"></i> ${escapeHtml(formatDate(since))}</span>` : ''}
                    </span>
                </span>
            </div>`;
        }

        function renderMembershipCard(item) {
            const comp = item.company || {};
            const compName = comp.name || '';
            const role = cnpjaTextOf(item.role);
            const since = item.since || '';
            const equity = comp.equity;

            return `<div class="cnpja-member">
                <span class="cnpja-member__avatar"><i class="fa-solid fa-building"></i></span>
                <span class="cnpja-member__content">
                    <span class="cnpja-member__name">${escapeHtml(compName || '—')}</span>
                    <span class="cnpja-member__meta">
                        ${role !== '—' ? `<span><i class="fa-solid fa-user-tie"></i> ${escapeHtml(role)}</span>` : ''}
                        ${since ? `<span><i class="fa-solid fa-calendar"></i> ${escapeHtml(formatDate(since))}</span>` : ''}
                        ${equity !== null && equity !== undefined && equity !== '' ? `<span><i class="fa-solid fa-sack-dollar"></i> ${escapeHtml(formatCurrency(equity))}</span>` : ''}
                    </span>
                </span>
            </div>`;
        }

        function initials(name) {
            const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
            if (!parts.length) return '?';
            if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }

        // ----- Local history (localStorage) -----
        function loadCnpjaHistory() {
            try {
                const raw = localStorage.getItem(CNPJA_HISTORY_KEY);
                const arr = raw ? JSON.parse(raw) : [];
                return Array.isArray(arr) ? arr : [];
            } catch (_) {
                return [];
            }
        }

        function buildCnpjaHistoryLabel(subtab, query, data) {
            if (subtab === 'empresa') {
                if (data && data.company && data.company.name) return data.company.name;
                if (Array.isArray(data && data.records) && data.records.length) {
                    const rec = data.records[0];
                    return (rec.company && rec.company.name) || rec.alias || query;
                }
                return query;
            }
            if (Array.isArray(data && data.records) && data.records.length) {
                return data.records[0].name || query;
            }
            if (data && data.name) return data.name;
            return query;
        }

        function saveCnpjaHistory(subtab, query, data) {
            try {
                const history = loadCnpjaHistory();
                history.unshift({
                    subtab,
                    query,
                    label: buildCnpjaHistoryLabel(subtab, query, data),
                    searchedAt: new Date().toISOString(),
                });

                const seen = new Set();
                const deduped = history.filter(item => {
                    const key = `${item.subtab}:${item.query}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });

                localStorage.setItem(CNPJA_HISTORY_KEY, JSON.stringify(deduped.slice(0, CNPJA_HISTORY_MAX)));
            } catch (_) {}
        }

        function clearCnpjaHistory(subtab) {
            try {
                const history = loadCnpjaHistory().filter(item => item.subtab !== subtab);
                localStorage.setItem(CNPJA_HISTORY_KEY, JSON.stringify(history));
            } catch (_) {}
            renderCnpjaHistory();
        }

        function renderCnpjaHistory() {
            renderCnpjaHistoryFor('empresa', dom.cnpjaHistoryEmpresa);
            renderCnpjaHistoryFor('socios', dom.cnpjaHistorySocios);
        }

        function renderCnpjaHistoryFor(subtab, container) {
            if (!container) return;

            const items = loadCnpjaHistory().filter(item => item.subtab === subtab);
            if (!items.length) {
                container.innerHTML = `<div class="cnpja-history__empty">${escapeHtml(t('cnpjaHistoryEmpty'))}</div>`;
                return;
            }

            const rows = items.map(item => `
                <button class="cnpja-history__item"
                        data-cnpja-history-subtab="${escapeHtml(item.subtab)}"
                        data-cnpja-history-query="${escapeHtml(item.query)}">
                    <span class="cnpja-history__item-label">${escapeHtml(item.label || item.query)}</span>
                    <span class="cnpja-history__item-taxid">${escapeHtml(item.query)}</span>
                </button>
            `).join('');

            container.innerHTML = `
                <div class="cnpja-history__header">
                    <span class="cnpja-history__title"><i class="fa-solid fa-clock-rotate-left"></i> ${escapeHtml(t('cnpjaHistoryTitle'))}</span>
                    <button class="cnpja-history__clear" data-cnpja-history-clear="${escapeHtml(subtab)}">
                        <i class="fa-solid fa-trash-can"></i> ${escapeHtml(t('cnpjaHistoryClear'))}
                    </button>
                </div>
                <div class="cnpja-history__list">${rows}</div>
            `;
        }

        // Delegated clicks: history, office search result, person search result
        document.addEventListener('click', (e) => {
            const clearBtn = e.target.closest('[data-cnpja-history-clear]');
            if (clearBtn) {
                clearCnpjaHistory(clearBtn.dataset.cnpjaHistoryClear);
                return;
            }

            const historyItem = e.target.closest('[data-cnpja-history-query]');
            if (historyItem) {
                const subtab = historyItem.dataset.cnpjaHistorySubtab;
                const query = historyItem.dataset.cnpjaHistoryQuery;
                switchCnpjaSubtab(subtab);
                if (subtab === 'empresa') {
                    dom.inputCnpjaEmpresa.value = query;
                    updateCnpjaEmpresaInput();
                } else {
                    dom.inputCnpjaSocio.value = query;
                    updateCnpjaSocioInput();
                }
                consultarCnpja();
                return;
            }

            const officeItem = e.target.closest('[data-cnpja-office-taxid]');
            if (officeItem) {
                runCnpjaRequest('office', { taxId: officeItem.dataset.cnpjaOfficeTaxid }, 'empresa');
                return;
            }

            const personItem = e.target.closest('[data-cnpja-person-id]');
            if (personItem) {
                const record = cnpjaPersonRecords.find(p => p.id === personItem.dataset.cnpjaPersonId);
                if (record) {
                    dom.cnpjaResultSocios.innerHTML = renderPersonDetail(record);
                }
            }
        });

        // ----- API request -----
        async function runCnpjaRequest(action, payload, subtab) {
            const errorEl = subtab === 'empresa' ? dom.cnpjaErrorEmpresa : dom.cnpjaErrorSocios;
            const resultEl = subtab === 'empresa' ? dom.cnpjaResultEmpresa : dom.cnpjaResultSocios;

            errorEl.textContent = '';
            errorEl.classList.remove('cnpja-error--visible');
            showLoading(t('cnpjaLoading'));

            try {
                const response = await fetch(CNPJA_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, ...payload }),
                });

                if (!response.ok) {
                    let detail = '';
                    let constraints = '';
                    try {
                        const errData = await response.json();
                        detail = (errData && (errData.error || errData.message)) || '';
                        if (Array.isArray(errData && errData.constraints)) {
                            constraints = errData.constraints.join('; ');
                        }
                    } catch (_) {}
                    throw new Error(detail || constraints || `HTTP ${response.status}`);
                }

                const data = await response.json();
                renderCnpjaResult(subtab, data);
                saveCnpjaHistory(subtab, payload.taxId || payload.query || '', data);
                renderCnpjaHistory();
            } catch (err) {
                console.error('CNPJá API error:', err);
                errorEl.textContent = `${t('cnpjaApiError')} ${err.message || ''}`;
                errorEl.classList.add('cnpja-error--visible');
                showToast(`${t('cnpjaApiError')} ${err.message || ''}`, 'error');
            } finally {
                hideLoading();
            }
        }

        function renderCnpjaResult(subtab, data) {
            const resultEl = subtab === 'empresa' ? dom.cnpjaResultEmpresa : dom.cnpjaResultSocios;
            if (subtab === 'empresa') {
                resultEl.innerHTML = renderOfficeResult(data);
            } else {
                cnpjaPersonRecords = Array.isArray(data.records) ? data.records : (data && typeof data === 'object' ? [data] : []);
                resultEl.innerHTML = renderPersonResult(data);
            }
        }

        // ----- Query dispatcher -----
        async function consultarCnpja() {
            const subtab = state.cnpjaSubtab;
            const inputEl = subtab === 'empresa' ? dom.inputCnpjaEmpresa : dom.inputCnpjaSocio;
            const errorEl = subtab === 'empresa' ? dom.cnpjaErrorEmpresa : dom.cnpjaErrorSocios;
            const value = inputEl.value.trim();
            const digits = onlyDigits(value);

            errorEl.textContent = '';
            errorEl.classList.remove('cnpja-error--visible');

            let action;
            let payload;

            if (subtab === 'empresa') {
                if (digits.length === 14 && value === digits) {
                    action = 'office';
                    payload = { taxId: digits };
                } else if (value.length >= 2) {
                    action = 'office-search';
                    payload = { query: value };
                } else {
                    const msg = t('cnpjaEmpresaShort');
                    errorEl.textContent = msg;
                    errorEl.classList.add('cnpja-error--visible');
                    showToast(msg, 'warning');
                    return;
                }
            } else {
                if (digits.length === 11 && value === digits) {
                    action = 'person-search';
                    payload = { query: digits };
                } else if (value.length >= 2) {
                    action = 'person-search';
                    payload = { query: value };
                } else {
                    const msg = t('cnpjaSocioShort');
                    errorEl.textContent = msg;
                    errorEl.classList.add('cnpja-error--visible');
                    showToast(msg, 'warning');
                    return;
                }
            }

            await runCnpjaRequest(action, payload, subtab);
        }

        dom.btnConsultarEmpresa.addEventListener('click', () => {
            state.cnpjaSubtab = 'empresa';
            consultarCnpja();
        });
        dom.btnConsultarSocios.addEventListener('click', () => {
            state.cnpjaSubtab = 'socios';
            consultarCnpja();
        });

        dom.inputCnpjaEmpresa.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                consultarCnpja();
            }
        });
        dom.inputCnpjaSocio.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                consultarCnpja();
            }
        });

        // =====================================================
        // INITIALIZATION
        // =====================================================
        function init() {
            // Restore saved theme
            const savedTheme = localStorage.getItem('danfe-theme') || 'light';
            applyTheme(savedTheme);

            // Restore saved language
            const savedLang = localStorage.getItem('danfe-lang') || 'pt';
            setLanguage(savedLang);

            // Set initial tab
            switchTab('upload');

            // Initialize input mask
            updateChaveInput();

            // Initialize CNPJá tab
            switchCnpjaSubtab('empresa');
            updateCnpjaEmpresaInput();
            updateCnpjaSocioInput();
            renderCnpjaHistory();

            // Pre-render NF-e links table
            renderNfeLinks('');

            // Check for pdfmake
            if (typeof pdfMake === 'undefined') {
                console.warn('pdfmake not loaded. PDF generation from XML will not work.');
                showToast(t('toastPdfmakeMissing'), 'warning', 8000);
            }

            // Check for Quagga2
            if (typeof Quagga === 'undefined') {
                console.warn('Quagga2 not loaded. Camera scanning will not work.');
                dom.btnScan.disabled = true;
                dom.btnScan.title = 'Biblioteca Quagga2 não carregada';
                if (dom.btnScanUpload) dom.btnScanUpload.disabled = true;
            }
        }

        // Run on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }

    })();
