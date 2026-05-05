/**
 * 社交功能模块 - 时间轴和评论系统
 */

async function loadTimeline() {
    try {
        const response = await fetch(`${CONFIG.JSONBIN_API_URL}/${CONFIG.BIN_IDS.timeline}`, {
            headers: {
                'X-Master-Key': CONFIG.JSONBIN_MASTER_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: 时间轴加载失败`);
        }
        
        const data = await response.json();
        renderTimeline(data.record);
        
    } catch (error) {
        console.error('加载时间轴失败:', error);
        document.getElementById('timelineContainer').innerHTML = 
            `<p style="text-align:center; color:#666;">时间轴加载失败</p>`;
    }
}

function renderTimeline(data) {
    const container = document.getElementById('timelineContainer');
    if (!data || !data.events || data.events.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666;">暂无时间轴数据</p>';
        return;
    }
    
    const timelineHTML = data.events.map(event => `
        <div class="timeline-item">
            <div class="timeline-date">${event.date}</div>
            <div class="timeline-content">${event.content}</div>
        </div>
    `).join('');
    
    container.innerHTML = timelineHTML;
}

async function loadComments() {
    try {
        const response = await fetch(`${CONFIG.JSONBIN_API_URL}/${CONFIG.BIN_IDS.comments}`, {
            headers: {
                'X-Master-Key': CONFIG.JSONBIN_MASTER_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: 评论加载失败`);
        }
        
        const data = await response.json();
        renderComments(data.record);
        
    } catch (error) {
        console.error('加载评论失败:', error);
        document.getElementById('commentsList').innerHTML = 
            `<p style="text-align:center; color:#666;">评论加载失败</p>`;
    }
}

function renderComments(data) {
    const container = document.getElementById('commentsList');
    if (!data || !data.comments || data.comments.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666;">暂无评论</p>';
        return;
    }
    
    const commentsHTML = data.comments.map(comment => `
        <div class="comment-item">
            <div class="comment-header">
                <span class="comment-author">${comment.author}</span>
                <span class="comment-time">${formatTime(comment.timestamp)}</span>
            </div>
            <div class="comment-content">${comment.content}</div>
        </div>
    `).join('');
    
    container.innerHTML = commentsHTML;
}

async function submitComment() {
    const author = document.getElementById('commentAuthor').value;
    const content = document.getElementById('commentText').value.trim();
    
    if (!content) {
        alert('请输入评论内容');
        return;
    }
    
    try {
        const response = await fetch(`${CONFIG.JSONBIN_API_URL}/${CONFIG.BIN_IDS.comments}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': CONFIG.JSONBIN_MASTER_KEY
            },
            body: JSON.stringify({
                comments: [
                    {
                        author: author,
                        content: content,
                        timestamp: new Date().toISOString()
                    }
                ]
            })
        });
        
        if (response.ok) {
            document.getElementById('commentText').value = '';
            loadComments();
        }
        
    } catch (error) {
        console.error('提交评论失败:', error);
        alert('评论提交失败，请重试');
    }
}

async function addTimelineEvent() {
    const date = prompt('请输入事件日期（YYYY-MM-DD）：');
    const content = prompt('请输入事件描述：');
    
    if (!date || !content) return;
    
    try {
        const response = await fetch(`${CONFIG.JSONBIN_API_URL}/${CONFIG.BIN_IDS.timeline}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': CONFIG.JSONBIN_MASTER_KEY
            },
            body: JSON.stringify({
                events: [
                    {
                        date: date,
                        content: content
                    }
                ]
            })
        });
        
        if (response.ok) {
            loadTimeline();
        }
        
    } catch (error) {
        console.error('添加时间轴事件失败:', error);
        alert('添加失败，请重试');
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadTimeline, renderTimeline, loadComments, renderComments, submitComment, addTimelineEvent, formatTime };
}