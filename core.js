/**
 * Core module - App init, navigation, content loading and rendering
 */

function initApp() {
    initNavigation();
    loadWikiContent();
    bindEventListeners();
    
    setTimeout(() => {
        loadTimeline();
        loadComments();
        checkMissingImages();
    }, 1000);
}

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const hash = window.location.hash.substring(1) || 'home';
    
    CONFIG.requestedPage = hash;
    CONFIG.currentPage = hash;
    
    navLinks.forEach(link => {
        const page = link.getAttribute('data-page');
        link.classList.toggle('active', page === hash);
        
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetPage = this.getAttribute('data-page');
            
            if (targetPage === CONFIG.currentPage && CONFIG.lastLoadedPage === targetPage) {
                return;
            }
            
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            window.location.hash = targetPage;
            
            CONFIG.requestedPage = targetPage;
            CONFIG.currentPage = targetPage;
            
            loadWikiContent();
        });
    });
    
    window.addEventListener('hashchange', function() {
        const hash = window.location.hash.substring(1) || 'home';
        if (CONFIG.BIN_IDS[hash]) {
            CONFIG.requestedPage = hash;
            CONFIG.currentPage = hash;
            loadWikiContent();
        }
    });
}

async function loadWikiContent() {
    // FIX: Force reset to prevent deadlock on fast page switching
    CONFIG.isLoading = false;
    
    // Abort old request
    if (CONFIG.currentRequest) {
        CONFIG.currentRequest.abort();
        CONFIG.currentRequest = null;
        if (CONFIG.DEBUG_MODE) console.log('[DEBUG] Aborted previous request');
    }
    
    const binId = CONFIG.BIN_IDS[CONFIG.currentPage];
    const container = document.getElementById('wikiContent');
    const loading = document.getElementById('contentLoading');
    
    if (!container || !loading) {
        console.error('Cannot find wikiContent or contentLoading element');
        return;
    }
    
    if (CONFIG.currentPage === 'home') {
        loading.style.display = 'none';
        showError('Home page needs JSONBin data, not configured');
        return;
    }
    
    if (!binId) {
        showError('Page config not found');
        return;
    }
    
    container.innerHTML = '';
    container.style.display = 'none';
    loading.style.display = 'block';
    loading.innerHTML = `<div class="simple-loading">Loading ${CONFIG.currentPage}...</div>`;
    
    CONFIG.isLoading = true;
    const targetPageForThisRequest = CONFIG.currentPage;
    
    if (CONFIG.DEBUG_MODE) {
        console.log(`[DEBUG] Loading page: ${targetPageForThisRequest}, BIN_ID: ${binId}`);
    }
    
    try {
        const controller = new AbortController();
        CONFIG.currentRequest = controller;
        
        // 5s timeout, fail fast let user retry
        const timeoutId = setTimeout(() => {
            if (CONFIG.DEBUG_MODE) console.log(`[DEBUG] Request timeout(5s), abort: ${targetPageForThisRequest}`);
            controller.abort();
        }, 5000);
        
        const response = await fetch(`${CONFIG.JSONBIN_API_URL}/${binId}`, {
            headers: { 'X-Master-Key': CONFIG.JSONBIN_MASTER_KEY },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (targetPageForThisRequest !== CONFIG.currentPage) {
            if (CONFIG.DEBUG_MODE) console.log(`[DEBUG] Page switched, ignore response`);
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Load failed`);
        }
        
        const data = await response.json();
        
        if (targetPageForThisRequest !== CONFIG.currentPage) {
            if (CONFIG.DEBUG_MODE) console.log(`[DEBUG] Page switched, ignore data`);
            return;
        }
        
        if (data.record) {
            renderWikiContent(data.record);
        } else if (data.content) {
            renderWikiContent(data);
        } else {
            showError(`API data format error: ${CONFIG.currentPage}`);
        }
        
    } catch (error) {
        // Page switch abort -> silent ignore
        if (error.name === 'AbortError' && targetPageForThisRequest !== CONFIG.currentPage) {
            if (CONFIG.DEBUG_MODE) console.log(`[DEBUG] Page switch abort, ignore`);
            return;
        }
        
        console.error('Load Wiki content failed:', error);
        
        if (targetPageForThisRequest === CONFIG.currentPage) {
            CONFIG.isLoading = false;
            loading.style.display = 'none';
            const msg = error.name === 'AbortError' ? 'Request timeout' : error.message;
            showError(`Load failed: ${msg} - Click to retry`);
        }
    } finally {
        if (CONFIG.currentPage === targetPageForThisRequest) {
            CONFIG.isLoading = false;
        }
    }
}

function renderWikiContent(data) {
    if (CONFIG.DEBUG_MODE) {
        console.log('[DEBUG] Rendering content');
        console.log('[DEBUG] requestedPage:', CONFIG.requestedPage);
        console.log('[DEBUG] currentPage:', CONFIG.currentPage);
        console.log('[DEBUG] data:', data);
    }
    
    CONFIG.currentPageData = data;
    CONFIG.rawContent = data ? (data.markdown || '') : '';
    
    const container = document.getElementById('wikiContent');
    const loading = document.getElementById('contentLoading');
    
    if (!container || !loading) {
        console.error('Cannot find wikiContent or contentLoading element');
        return;
    }
    
    if (CONFIG.requestedPage && CONFIG.requestedPage !== CONFIG.currentPage) {
        console.warn(`Data mismatch: requested ${CONFIG.requestedPage}, got ${CONFIG.currentPage}`);
        return;
    }
    
    CONFIG.lastLoadedPage = CONFIG.currentPage;
    
    const editToolbar = document.getElementById('editToolbar');
    const editContentBtn = document.getElementById('editContentBtn');
    if (CONFIG.currentPage === 'home') {
        if (editToolbar) editToolbar.style.display = 'none';
    } else {
        if (editToolbar) editToolbar.style.display = 'flex';
    }
    
    if (CONFIG.DEBUG_MODE) {
        console.log('[DEBUG] container element:', container);
        console.log('[DEBUG] loading element:', loading);
        console.log('[DEBUG] data.content exists:', !!data.content);
        console.log('[DEBUG] data.content value:', data.content ? data.content.substring(0, 100) + '...' : 'undefined');
    }
    
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    if (!data || !data.content) {
        if (CONFIG.DEBUG_MODE) console.log('[DEBUG] data.content empty, show error');
        showError(`Load failed: ${CONFIG.currentPage} page content empty`);
        return;
    } else {
        if (CONFIG.DEBUG_MODE) console.log('[DEBUG] Parsing Markdown');
        
        let htmlContent;
        if (data.content.includes('<') && data.content.includes('>')) {
            if (CONFIG.DEBUG_MODE) console.log('[DEBUG] Content is already HTML');
            htmlContent = data.content;
        } else {
            htmlContent = parseMarkdown(data.content);
        }
        
        if (CONFIG.DEBUG_MODE) console.log('[DEBUG] Final HTML:', htmlContent.substring(0, 150) + '...');
        
        if (CONFIG.paperMode && !htmlContent.includes('class="paper"')) {
            htmlContent = `<div class="paper" data-page="${CONFIG.currentPage}">${htmlContent}</div>`;
        }
        
        container.innerHTML = htmlContent;
        
        if (CONFIG.paperMode) {
            container.classList.add('paper-mode');
        } else {
            container.classList.remove('paper-mode');
        }
        
        container.style.color = '';
        container.style.background = '';
        
        if (window.MathJax) {
            MathJax.typeset();
        }
        container.style.minHeight = '';
        container.style.padding = '';
        
        if (CONFIG.DEBUG_MODE) {
            console.log('[DEBUG] container.innerHTML set');
            console.log('[DEBUG] container content length:', container.innerHTML.length);
            console.log('[DEBUG] content preview:', container.textContent.substring(0, 100) + '...');
        }
        
        container.setAttribute('data-current-page', CONFIG.currentPage);
    }
    
    if (data.title) {
        document.title = `${data.title} - BNUZ iGEM Wiki`;
    }
    
    if (window.MathJax) {
        if (MathJax.typeset) {
            MathJax.typeset();
        } else if (MathJax.startup && MathJax.startup.promise) {
            MathJax.startup.promise.then(() => {
                MathJax.typeset();
            });
        }
    }
    
    const timelineSection = document.getElementById('timelineSection');
    const commentSection = document.getElementById('commentSection');
    
    if (timelineSection) {
        timelineSection.style.display = 
            data.features && data.features.timeline ? 'block' : 'none';
    }
    
    if (commentSection) {
        commentSection.style.display = 
            data.features && data.features.comments ? 'block' : 'none';
    }
    
    container.style.opacity = '0';
    container.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
        loading.style.display = 'none';
        container.style.display = 'block';
        
        setTimeout(() => {
            container.style.opacity = '1';
        }, 10);
    }, 100);
}

function enableEditing() {
    CONFIG.isEditing = true;
    const contentContainer = document.getElementById('wikiContent');
    const editorContainer = document.getElementById('editorContainer');
    const formatToolbar = document.getElementById('formatToolbar');
    const contentEditor = document.getElementById('contentEditor');
    const saveContentBtn = document.getElementById('saveContentBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editContentBtn = document.getElementById('editContentBtn');
    const editToolbar = document.getElementById('editToolbar');
    
    if (!contentContainer || !editorContainer || !formatToolbar || !contentEditor) {
        console.error('Cannot find edit-related DOM elements');
        return;
    }
    
    CONFIG.originalContent = contentContainer.innerHTML;
    
    let markdownContent = '';
    
    if (CONFIG.rawContent && CONFIG.rawContent.trim()) {
        markdownContent = CONFIG.rawContent;
    } else if (CONFIG.currentPageData && CONFIG.currentPageData.markdown) {
        markdownContent = CONFIG.currentPageData.markdown;
    } else {
        let contentToEdit = CONFIG.originalContent;
        if (CONFIG.paperMode && contentToEdit.includes('<div class="paper">')) {
            const match = contentToEdit.match(/<div class="paper">([\s\S]*?)<\/div>/);
            if (match && match[1]) {
                contentToEdit = match[1];
            }
        }
        markdownContent = htmlToMarkdown(contentToEdit);
    }
    
    contentEditor.value = markdownContent;
    
    contentContainer.style.display = 'none';
    editorContainer.style.display = 'block';
    formatToolbar.style.display = 'flex';
    if (saveContentBtn) saveContentBtn.style.display = 'inline-block';
    if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';
    if (editContentBtn) editContentBtn.style.display = 'none';
    if (editToolbar) editToolbar.style.display = 'none';
    
    updateEditStatus('Edit mode enabled');
}

async function saveContent() {
    const binId = CONFIG.BIN_IDS[CONFIG.currentPage];
    const newMarkdown = document.getElementById('contentEditor').value;
    
    if (!binId) {
        showError('Page config not found');
        return;
    }
    
    const imageMatches = newMarkdown.match(CONFIG.IMAGES.SYNTAX.PATTERN);
    if (imageMatches) {
        const invalidSyntax = [];
        
        imageMatches.forEach(syntax => {
            const match = syntax.match(CONFIG.IMAGES.SYNTAX.SINGLE);
            if (!match) {
                invalidSyntax.push(syntax);
            }
        });
        
        if (invalidSyntax.length > 0) {
            if (!confirm(`Found ${invalidSyntax.length} invalid image syntax. Continue?\n\nInvalid:\n${invalidSyntax.join('\n')}`)) {
                return;
            }
        }
    }
    
    if (!confirm('Confirm save?')) {
        return;
    }
    
    try {
        updateEditStatus('Saving...');
        
        const getResponse = await fetch(`${CONFIG.JSONBIN_API_URL}/${binId}`, {
            headers: {
                'X-Master-Key': CONFIG.JSONBIN_MASTER_KEY,
                'X-Bin-Meta': 'false'
            }
        });
        
        if (!getResponse.ok) {
            throw new Error(`HTTP ${getResponse.status}: Get data failed`);
        }
        
        const currentData = await getResponse.json();
        
        const htmlContent = parseMarkdown(newMarkdown);
        
        const updatedData = {
            ...currentData,
            content: htmlContent,
            markdown: newMarkdown,
            last_updated: new Date().toISOString()
        };
        
        const putResponse = await fetch(`${CONFIG.JSONBIN_API_URL}/${binId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': CONFIG.JSONBIN_MASTER_KEY
            },
            body: JSON.stringify(updatedData)
        });
        
        if (!putResponse.ok) {
            throw new Error(`HTTP ${putResponse.status}: Save failed`);
        }
        
        renderWikiContent(updatedData);
        
        cancelEditing();
        updateEditStatus('Save success!');
        
        if (currentData.features && currentData.features.timeline) {
            loadTimeline();
        }
        if (currentData.features && currentData.features.comments) {
            loadComments();
        }
        
    } catch (error) {
        console.error('Save failed:', error);
        showError(`Save failed: ${error.message}`);
    }
}

function cancelEditing() {
    CONFIG.isEditing = false;
    
    const contentEditor = document.getElementById('contentEditor');
    const editorContainer = document.getElementById('editorContainer');
    const formatToolbar = document.getElementById('formatToolbar');
    const wikiContent = document.getElementById('wikiContent');
    const saveContentBtn = document.getElementById('saveContentBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editContentBtn = document.getElementById('editContentBtn');
    const editToolbar = document.getElementById('editToolbar');
    
    if (contentEditor) contentEditor.value = '';
    if (editorContainer) editorContainer.style.display = 'none';
    if (formatToolbar) formatToolbar.style.display = 'none';
    if (wikiContent) wikiContent.style.display = 'block';
    if (saveContentBtn) saveContentBtn.style.display = 'none';
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';
    if (editContentBtn) editContentBtn.style.display = 'inline-block';
    if (editToolbar) editToolbar.style.display = 'flex';
    
    updateEditStatus('');
}

function applyFormat(format) {
    const editor = document.getElementById('contentEditor');
    if (!editor) return;
    
    const selectionStart = editor.selectionStart;
    const selectionEnd = editor.selectionEnd;
    const selectedText = editor.value.substring(selectionStart, selectionEnd);
    const beforeText = editor.value.substring(0, selectionStart);
    const afterText = editor.value.substring(selectionEnd);
    
    let formattedText = '';
    
    switch(format) {
        case 'h2':
            formattedText = `# ${selectedText || 'Title'}`;
            break;
        case 'h3':
            formattedText = `## ${selectedText || 'Subtitle'}`;
            break;
        case 'h4':
            formattedText = `### ${selectedText || 'Small title'}`;
            break;
        case 'h5':
            formattedText = `#### ${selectedText || 'Smaller title'}`;
            break;
        case 'h6':
            formattedText = `##### ${selectedText || 'Smallest title'}`;
            break;
        case 'p':
            formattedText = `${selectedText || 'Paragraph'}`;
            break;
        case 'strong':
            formattedText = `**${selectedText || 'Bold text'}**`;
            break;
        case 'reference':
            formattedText = `>>> ${selectedText || 'Quote'}`;
            break;
        case 'img':
            const imgUrl = prompt('Enter image URL:');
            if (imgUrl) {
                const altText = prompt('Enter image description:', 'Image');
                formattedText = `![${altText || 'Image'}](${imgUrl})`;
            }
            break;
        case 'ul':
            formattedText = `- ${selectedText || 'List item'}`;
            break;
        case 'latex-inline':
            formattedText = '$' + (selectedText || 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}') + '$';
            break;
        case 'latex-block':
            formattedText = '$$' + (selectedText || 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}') + '$$';
            break;
    }
    
    editor.value = beforeText + formattedText + afterText;
    editor.focus();
    
    const newPosition = selectionStart + formattedText.length;
    editor.setSelectionRange(newPosition, newPosition);
}

function bindEventListeners() {
    const editContentBtn = document.getElementById('editContentBtn');
    const saveContentBtn = document.getElementById('saveContentBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const commentSubmitBtn = document.getElementById('commentSubmitBtn');
    const addTimelineBtn = document.getElementById('addTimelineBtn');
    const insertImageBtn = document.getElementById('insertImageBtn');
    const paperModeToggle = document.getElementById('paperModeToggle');
    
    if (editContentBtn) editContentBtn.addEventListener('click', enableEditing);
    if (saveContentBtn) saveContentBtn.addEventListener('click', saveContent);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', cancelEditing);
    if (commentSubmitBtn) commentSubmitBtn.addEventListener('click', submitComment);
    if (addTimelineBtn) addTimelineBtn.addEventListener('click', addTimelineEvent);
    
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const format = this.getAttribute('data-format');
            applyFormat(format);
        });
    });
    
    if (insertImageBtn) insertImageBtn.addEventListener('click', insertImageSyntax);
    
    if (paperModeToggle) {
        paperModeToggle.addEventListener('change', function() {
            CONFIG.paperMode = this.checked;
            loadWikiContent();
        });
    }
    
    const exportAllBtn = document.getElementById('exportAllBtn');
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', exportAllData);
    }
    
    document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
        let hideTimeout;
        
        dropdown.addEventListener('mouseenter', function() {
            clearTimeout(hideTimeout);
            const content = this.querySelector('.nav-dropdown-content');
            if (content) {
                content.style.display = 'block';
                content.style.opacity = '1';
                content.style.transform = 'translateY(0)';
            }
        });
        
        dropdown.addEventListener('mouseleave', function() {
            const content = this.querySelector('.nav-dropdown-content');
            if (content) {
                hideTimeout = setTimeout(() => {
                    content.style.opacity = '0';
                    content.style.transform = 'translateY(-10px)';
                    setTimeout(() => {
                        if (content.style.opacity === '0') {
                            content.style.display = 'none';
                        }
                    }, 200);
                }, 300);
            }
        });
    });
}

function updateEditStatus(message) {
    const editStatus = document.getElementById('editStatus');
    if (editStatus) {
        editStatus.textContent = message;
    }
}

async function exportAllData() {
    const exportBtn = document.getElementById('exportAllBtn');
    
    if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.textContent = 'Exporting...';
    }
    
    const allData = {};
    const pages = Object.keys(CONFIG.BIN_IDS).filter(page => page !== 'home');
    
    try {
        for (const page of pages) {
            const binId = CONFIG.BIN_IDS[page];
            if (!binId) continue;
            
            try {
                const response = await fetch(`${CONFIG.JSONBIN_API_URL}/${binId}`, {
                    headers: {
                        'X-Master-Key': CONFIG.JSONBIN_MASTER_KEY
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    allData[page] = data;
                    if (CONFIG.DEBUG_MODE) {
                        console.log(`[DEBUG] Exported page: ${page}`);
                    }
                } else {
                    console.warn(`[WARN] Export page ${page} failed: HTTP ${response.status}`);
                    allData[page] = { error: `HTTP ${response.status}` };
                }
            } catch (error) {
                console.warn(`[WARN] Export page ${page} failed:`, error);
                allData[page] = { error: error.message };
            }
        }
        
        const exportInfo = {
            _exportDate: new Date().toISOString(),
            version: '1.0.0',
            totalPages: pages.length,
            pages: allData
        };
        
        const blob = new Blob([JSON.stringify(exportInfo, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (CONFIG.DEBUG_MODE) {
            console.log('[DEBUG] Export success:', exportInfo);
        }
        
        alert(`Successfully exported ${pages.length} pages!`);
        
    } catch (error) {
        console.error('Export failed:', error);
        alert('Export failed: ' + error.message);
    } finally {
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.textContent = 'Export All Data';
        }
    }
}

function showError(message) {
    const container = document.getElementById('wikiContent');
    const loading = document.getElementById('contentLoading');
    
    if (!container) {
        console.error('Cannot find wikiContent element');
        return;
    }
    
    // FIX: Force reset, ensure retry button works
    CONFIG.isLoading = false;
    
    if (loading) {
        loading.style.display = 'none';
    }
    
    container.innerHTML = `<div class="error-state" style="text-align:center; padding:2rem; color:#e74c3c;">
        <p style="font-size:1.2rem; margin-bottom:1rem;">Load Failed</p>
        <p>${message}</p>
        <button onclick="loadWikiContent()" style="margin-top:1rem; padding:0.5rem 1.5rem; background:#3498db; color:white; border:none; border-radius:4px; cursor:pointer;">
            Retry
        </button>
    </div>`;
    container.style.display = 'block';
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initApp, initNavigation, loadWikiContent, renderWikiContent, enableEditing, saveContent, cancelEditing, applyFormat, bindEventListeners, updateEditStatus, showError };
} else {
    document.addEventListener('DOMContentLoaded', function() {
        initApp();
    });
}
