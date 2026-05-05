/**
 * 核心功能模块 - 应用初始化、导航、内容加载和渲染
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
    const hash = window.location.hash.substring(1) || 'project';
    
    // 设置初始页面状态
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
        const hash = window.location.hash.substring(1) || 'project';
        if (CONFIG.BIN_IDS[hash]) {
            CONFIG.requestedPage = hash;
            CONFIG.currentPage = hash;
            loadWikiContent();
        }
    });
}

async function loadWikiContent() {
    // 1. 在开始新请求前，主动中止任何可能存在的旧请求
    if (CONFIG.currentRequest) {
        CONFIG.currentRequest.abort();
        CONFIG.currentRequest = null;
        if (CONFIG.DEBUG_MODE) console.log('[DEBUG] 已中止之前的请求');
    }

    if (CONFIG.isLoading) {
        if (CONFIG.DEBUG_MODE) console.log('[DEBUG] 已有加载请求在进行中，跳过');
        return;
    }
    
    const binId = CONFIG.BIN_IDS[CONFIG.currentPage];
    if (!binId) {
        showError('未找到该页面的配置信息');
        return;
    }
    
    const container = document.getElementById('wikiContent');
    const loading = document.getElementById('contentLoading');
    
    if (!container || !loading) {
        console.error('无法找到 wikiContent 或 contentLoading 元素');
        return;
    }
    
    container.innerHTML = '';
    container.style.display = 'none';
    
    loading.style.display = 'block';
    loading.innerHTML = `
        <div class="loading-spinner"></div>
        <p>正在加载 ${CONFIG.currentPage} 内容...</p>
    `;
    
    CONFIG.isLoading = true;
    
    // 2. 使用一个局部变量记录本次请求的目标页面，避免闭包问题
    const targetPageForThisRequest = CONFIG.currentPage;
    
    if (CONFIG.DEBUG_MODE) {
        console.log(`[DEBUG] 开始加载页面: ${targetPageForThisRequest}, BIN_ID: ${binId}`);
    }
    
    try {
        const controller = new AbortController();
        // 3. （可选）将超时时间延长至30秒，为慢速网络留出余地
        const timeoutId = setTimeout(() => {
            if (CONFIG.DEBUG_MODE) console.log(`[DEBUG] 请求超时，中止: ${targetPageForThisRequest}`);
            controller.abort();
        }, 30000); // 从 10000 改为 30000 毫秒
        CONFIG.currentRequest = controller;
        
        const response = await fetch(`${CONFIG.JSONBIN_API_URL}/${binId}`, {
            headers: {
                'X-Master-Key': CONFIG.JSONBIN_MASTER_KEY
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // 4. 在关键节点严格检查：当前页面是否仍是发起请求时的目标页面
        if (targetPageForThisRequest !== CONFIG.currentPage) {
            if (CONFIG.DEBUG_MODE) console.log(`[DEBUG] 页面已从 ${targetPageForThisRequest} 切换至 ${CONFIG.currentPage}，忽略本响应`);
            return; // 静默退出，不渲染，不报错
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: 加载失败`);
        }
        
        const data = await response.json();
        
        // 5. 再次验证
        if (targetPageForThisRequest !== CONFIG.currentPage) {
            if (CONFIG.DEBUG_MODE) console.log(`[DEBUG] 页面在数据处理前已切换，忽略数据`);
            return;
        }
        
        if (CONFIG.DEBUG_MODE) {
            console.log('[DEBUG] API响应成功');
            console.log('[DEBUG] data类型:', typeof data);
            console.log('[DEBUG] data有record:', 'record' in data);
            console.log('[DEBUG] data有content:', 'content' in data);
        }
        
        if (data.record) {
            if (CONFIG.DEBUG_MODE) console.log('[DEBUG] 准备调用 renderWikiContent(data.record)');
            renderWikiContent(data.record);
        } else if (data.content) {
            if (CONFIG.DEBUG_MODE) console.log('[DEBUG] data.record不存在，尝试直接使用data');
            renderWikiContent(data);
        } else {
            if (CONFIG.DEBUG_MODE) console.log('[DEBUG] 数据中没有record和content字段');
            // 使用备用数据
            if (CONFIG.USE_FALLBACK_DATA && CONFIG.FALLBACK_DATA[CONFIG.currentPage]) {
                if (CONFIG.DEBUG_MODE) console.log('[DEBUG] 使用备用数据');
                renderWikiContent(CONFIG.FALLBACK_DATA[CONFIG.currentPage]);
            }
        }
        
    } catch (error) {
        // 6. 区分处理"中止错误"和"其他网络/服务器错误"
        if (error.name === 'AbortError') {
            // 这是预期内的中止，通常因页面切换或超时导致，无需作为错误提示给用户
            if (CONFIG.DEBUG_MODE) console.log(`[DEBUG] 请求被中止 (${error.name})，目标页面: ${targetPageForThisRequest}`);
            
            // 如果页面未切换，需要隐藏加载动画并显示备用数据
            if (targetPageForThisRequest === CONFIG.currentPage) {
                CONFIG.isLoading = false;
                loading.style.display = 'none';
                
                // 使用备用数据
                if (CONFIG.USE_FALLBACK_DATA && CONFIG.FALLBACK_DATA[CONFIG.currentPage]) {
                    if (CONFIG.DEBUG_MODE) console.log(`[DEBUG] 对 ${CONFIG.currentPage} 使用备用数据（请求被中止）`);
                    renderWikiContent(CONFIG.FALLBACK_DATA[CONFIG.currentPage]);
                }
            }
            
            return; // 静默退出
        }
        
        console.error('加载Wiki内容失败:', error);
        
        // 7. 仅当错误发生在当前仍然活跃的页面上时，才显示错误或备用数据
        if (targetPageForThisRequest === CONFIG.currentPage) {
            if (CONFIG.USE_FALLBACK_DATA && CONFIG.FALLBACK_DATA[CONFIG.currentPage]) {
                if (CONFIG.DEBUG_MODE) console.log(`[DEBUG] 对 ${CONFIG.currentPage} 使用备用数据`);
                renderWikiContent(CONFIG.FALLBACK_DATA[CONFIG.currentPage]);
            } else {
                // 只有当页面未切换，且是真正的网络/服务器错误时，才提示用户
                showError(`加载失败: ${error.message}`);
            }
        } else {
            if (CONFIG.DEBUG_MODE) console.log(`[DEBUG] 错误发生在已切换的旧页面(${targetPageForThisRequest})上，忽略`);
        }
    } finally {
        // 8. 清理：仅当此finally块属于当前最新请求时才重置状态
        if (CONFIG.currentPage === targetPageForThisRequest) {
            CONFIG.isLoading = false;
        }
        // 注意：不要在此处将 CONFIG.currentRequest 设为 null，因为可能已被新的请求覆盖
        // 更安全的做法是，在上面 abort 旧请求后立即设为 null，或由新的请求流程覆盖
    }
}

function renderWikiContent(data) {
    if (CONFIG.DEBUG_MODE) {
        console.log('[DEBUG] 开始渲染内容');
        console.log('[DEBUG] requestedPage:', CONFIG.requestedPage);
        console.log('[DEBUG] currentPage:', CONFIG.currentPage);
        console.log('[DEBUG] 数据:', data);
    }
    
    const container = document.getElementById('wikiContent');
    const loading = document.getElementById('contentLoading');
    
    if (!container || !loading) {
        console.error('无法找到 wikiContent 或 contentLoading 元素');
        return;
    }
    
    if (CONFIG.requestedPage && CONFIG.requestedPage !== CONFIG.currentPage) {
        console.warn(`数据不匹配: 请求的是 ${CONFIG.requestedPage}, 收到的是 ${CONFIG.currentPage}`);
        return;
    }
    
    CONFIG.lastLoadedPage = CONFIG.currentPage;
    
    if (CONFIG.DEBUG_MODE) {
        console.log('[DEBUG] container 元素:', container);
        console.log('[DEBUG] loading 元素:', loading);
        console.log('[DEBUG] data.content 存在:', !!data.content);
        console.log('[DEBUG] data.content 值:', data.content ? data.content.substring(0, 100) + '...' : 'undefined');
    }
    
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    setTimeout(() => {
        container.innerHTML = '';
    }, 0);
    
    if (!data || !data.content) {
        if (CONFIG.DEBUG_MODE) console.log('[DEBUG] data.content 为空，显示默认内容');
        container.innerHTML = CONFIG.paperMode 
            ? '<div class="paper"><p>暂无内容，请编辑此页面</p></div>'
            : '<div class="empty-state"><p>暂无内容，请编辑此页面</p></div>';
    } else {
        if (CONFIG.DEBUG_MODE) console.log('[DEBUG] 开始解析Markdown内容');
        let htmlContent = parseMarkdown(data.content);
        
        if (CONFIG.DEBUG_MODE) console.log('[DEBUG] 解析后的HTML:', htmlContent.substring(0, 150) + '...');
        
        if (CONFIG.paperMode && !htmlContent.includes('class="paper"')) {
            htmlContent = `<div class="paper" data-page="${CONFIG.currentPage}">${htmlContent}</div>`;
        }
        
        container.innerHTML = htmlContent;
        
        if (CONFIG.DEBUG_MODE) console.log('[DEBUG] container.innerHTML 设置完成');
        
        container.setAttribute('data-current-page', CONFIG.currentPage);
    }
    
    if (data.title) {
        document.title = `${data.title} - 北师珠iGEM Wiki`;
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
    
    if (!contentContainer || !editorContainer || !formatToolbar || !contentEditor) {
        console.error('无法找到编辑相关的DOM元素');
        return;
    }
    
    CONFIG.originalContent = contentContainer.innerHTML;
    let contentToEdit = CONFIG.originalContent;
    if (CONFIG.paperMode && contentToEdit.includes('<div class="paper">')) {
        const match = contentToEdit.match(/<div class="paper">([\s\S]*?)<\/div>/);
        if (match && match[1]) {
            contentToEdit = match[1];
        }
    }
    
    const markdownContent = htmlToMarkdown(contentToEdit);
    contentEditor.value = markdownContent;
    
    contentContainer.style.display = 'none';
    editorContainer.style.display = 'block';
    formatToolbar.style.display = 'flex';
    if (saveContentBtn) saveContentBtn.style.display = 'inline-block';
    if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';
    if (editContentBtn) editContentBtn.style.display = 'none';
    
    updateEditStatus('编辑模式已启用');
}

async function saveContent() {
    const binId = CONFIG.BIN_IDS[CONFIG.currentPage];
    const newMarkdown = document.getElementById('contentEditor').value;
    
    if (!binId) {
        showError('未找到该页面的配置信息');
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
            if (!confirm(`发现 ${invalidSyntax.length} 个格式不正确的图片语法。是否继续保存？\n\n不正确的语法：\n${invalidSyntax.join('\n')}`)) {
                return;
            }
        }
    }
    
    if (!confirm('确定要保存修改吗？')) {
        return;
    }
    
    try {
        updateEditStatus('正在保存...');
        
        const getResponse = await fetch(`${CONFIG.JSONBIN_API_URL}/${binId}`, {
            headers: {
                'X-Master-Key': CONFIG.JSONBIN_MASTER_KEY,
                'X-Bin-Meta': 'false'
            }
        });
        
        if (!getResponse.ok) {
            throw new Error(`HTTP ${getResponse.status}: 获取数据失败`);
        }
        
        const currentData = await getResponse.json();
        
        const htmlContent = parseMarkdown(newMarkdown);
        
        const updatedData = {
            ...currentData,
            content: htmlContent,
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
            throw new Error(`HTTP ${putResponse.status}: 保存失败`);
        }
        
        renderWikiContent(updatedData);
        
        cancelEditing();
        updateEditStatus('保存成功！');
        
        if (currentData.features && currentData.features.timeline) {
            loadTimeline();
        }
        if (currentData.features && currentData.features.comments) {
            loadComments();
        }
        
    } catch (error) {
        console.error('保存内容失败:', error);
        showError(`保存失败: ${error.message}`);
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
    
    if (contentEditor) contentEditor.value = '';
    if (editorContainer) editorContainer.style.display = 'none';
    if (formatToolbar) formatToolbar.style.display = 'none';
    if (wikiContent) wikiContent.style.display = 'block';
    if (saveContentBtn) saveContentBtn.style.display = 'none';
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';
    if (editContentBtn) editContentBtn.style.display = 'inline-block';
    
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
            formattedText = `# ${selectedText || '标题'}`;
            break;
        case 'h3':
            formattedText = `## ${selectedText || '子标题'}`;
            break;
        case 'h4':
            formattedText = `### ${selectedText || '小标题'}`;
            break;
        case 'h5':
            formattedText = `#### ${selectedText || '小小标题'}`;
            break;
        case 'h6':
            formattedText = `##### ${selectedText || '小小小标题'}`;
            break;
        case 'p':
            formattedText = `${selectedText || '段落内容'}`;
            break;
        case 'strong':
            formattedText = `**${selectedText || '强调文本'}**`;
            break;
        case 'reference':
            formattedText = `>>> ${selectedText || '引用内容'}`;
            break;
        case 'img':
            const imgUrl = prompt('请输入图片URL:');
            if (imgUrl) {
                const altText = prompt('请输入图片描述:', '图片描述');
                formattedText = `![${altText || '图片'}](${imgUrl})`;
            }
            break;
        case 'ul':
            formattedText = `- ${selectedText || '列表项'}`;
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
}

function updateEditStatus(message) {
    const editStatus = document.getElementById('editStatus');
    if (editStatus) {
        editStatus.textContent = message;
    }
}

function showError(message) {
    const container = document.getElementById('wikiContent');
    const loading = document.getElementById('contentLoading');
    
    if (!container) {
        console.error('无法找到 wikiContent 元素');
        return;
    }
    
    if (loading) {
        loading.style.display = 'none';
    }
    
    container.innerHTML = `<div class="error-state" style="text-align:center; padding:2rem; color:#e74c3c;">
        <p style="font-size:1.2rem; margin-bottom:1rem;">⚠️ 加载失败</p>
        <p>${message}</p>
        <button onclick="loadWikiContent()" style="margin-top:1rem; padding:0.5rem 1.5rem; background:#3498db; color:white; border:none; border-radius:4px; cursor:pointer;">
            重试
        </button>
    </div>`;
    container.style.display = 'block';
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initApp, initNavigation, loadWikiContent, renderWikiContent, enableEditing, saveContent, cancelEditing, applyFormat, bindEventListeners, updateEditStatus, showError };
}