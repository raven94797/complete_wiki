/**
 * Markdown解析模块 - 处理Markdown和HTML之间的转换
 */

function parseMarkdown(markdown) {
    if (!markdown) return '';
    
    let processed = markdown;
    
    processed = processed.replace(CONFIG.IMAGES.SYNTAX.PATTERN, function(match, page, number, description) {
        return generateImageHTML(page, number, description);
    });
    
    return processed
        .replace(/^# (.*$)/gm, CONFIG.paperMode ? '<h2>$1</h2>' : '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, CONFIG.paperMode ? '<h3>$1</h3>' : '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, CONFIG.paperMode ? '<h4>$1</h4>' : '<h3>$1</h3>')
        .replace(/^#### (.*$)/gm, CONFIG.paperMode ? '<h5>$1</h5>' : '<h4>$1</h4>')
        .replace(/^##### (.*$)/gm, CONFIG.paperMode ? '<h6>$1</h6>' : '<h5>$1</h5>')
        .replace(/\*\*(.*?)\*\*/g, CONFIG.paperMode ? '<span class="strong">$1</span>' : '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/!\[(.*?)\]\((.*?)\)/g, CONFIG.paperMode 
            ? '<img src="$2" alt="$1"><div class="figure-caption">$1</div>'
            : '<img src="$2" alt="$1" style="max-width:100%; border-radius:8px; margin:1rem 0;">')
        .replace(/\[(.*?)\]\((.*?)\)/g, CONFIG.paperMode 
            ? '<a href="$2" target="_blank" class="referlink">$1</a>'
            : '<a href="$2" target="_blank">$1</a>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^>>>\s*(.*$)/gm, CONFIG.paperMode 
            ? '<div class="reference"><p>$1</p></div>'
            : '<blockquote>$1</blockquote>')
        .replace(/^\|?(.*)\|?$/gm, function(match) {
            if (match.includes('|')) {
                return '<tr><td>' + match.replace(/\|/g, '</td><td>') + '</td></tr>';
            }
            return match;
        });
}

function htmlToMarkdown(html) {
    if (!html) return '';
    
    let result = html
        .replace(/<div class="content-image-container"[^>]*data-image-id="([^"]+)"[^>]*>[\s\S]*?<div class="content-image-caption">(.*?)<\/div>[\s\S]*?<\/div>/gi, function(match, imageId, description) {
            const matchId = imageId.match(/([a-z]+)（(\d+)）/);
            if (matchId) {
                const page = matchId[1];
                const number = matchId[2];
                return `（${page}（${number}），${description}）`;
            }
            return match;
        });
    
    return result
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '# $1\n\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '## $1\n\n')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '### $1\n\n')
        .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '#### $1\n\n')
        .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '##### $1\n\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<span class="strong"[^>]*>(.*?)<\/span>/gi, '**$1**')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<img[^>]*src="(.*?)"[^>]*alt="(.*?)"[^>]*>/gi, '![$2]($1)')
        .replace(/<a[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, function(match) {
            return match.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
        })
        .replace(/<div class="reference"[^>]*>[\s\S]*?<p>(.*?)<\/p>[\s\S]*?<\/div>/gi, '>>> $1')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseMarkdown, htmlToMarkdown };
}