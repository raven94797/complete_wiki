/**
 * Markdown解析模块 - 处理Markdown和HTML之间的转换
 */

function parseMarkdown(markdown) {
    if (!markdown) return '';
    
    let processed = markdown;
    
    // 保存LaTeX公式，防止被Markdown解析器破坏
    const latexFormulas = [];
    let formulaIndex = 0;
    
    // 保存块级公式 $$...$$
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, function(match, formula) {
        const placeholder = `__LATEX_BLOCK_${formulaIndex}__`;
        latexFormulas.push({ type: 'block', content: match });
        formulaIndex++;
        return placeholder;
    });
    
    // 保存行内公式 $...$
    processed = processed.replace(/\$([^$]+)\$/g, function(match, formula) {
        const placeholder = `__LATEX_INLINE_${formulaIndex}__`;
        latexFormulas.push({ type: 'inline', content: match });
        formulaIndex++;
        return placeholder;
    });
    
    // 处理图片语法
    processed = processed.replace(CONFIG.IMAGES.SYNTAX.PATTERN, function(match, page, number, description) {
        return generateImageHTML(page, number, description);
    });
    
    // 处理LaTeX文档结构命令（排版命令）
    processed = processLatexStructure(processed);
    
    // 处理Markdown语法
    processed = processed
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
    
    // 恢复LaTeX公式
    latexFormulas.forEach((formula, index) => {
        processed = processed.replace(`__LATEX_${formula.type.toUpperCase()}_${index}__`, formula.content);
    });
    
    return processed;
}

// 处理LaTeX文档结构命令
function processLatexStructure(text) {
    if (!text) return text;
    
    let processed = text;
    
    // 处理\section{标题}
    processed = processed.replace(/\\section\{([^}]+)\}/g, CONFIG.paperMode ? '<h2>$1</h2>' : '<h1>$1</h1>');
    
    // 处理\subsection{标题}
    processed = processed.replace(/\\subsection\{([^}]+)\}/g, CONFIG.paperMode ? '<h3>$1</h3>' : '<h2>$1</h2>');
    
    // 处理\subsubsection{标题}
    processed = processed.replace(/\\subsubsection\{([^}]+)\}/g, CONFIG.paperMode ? '<h4>$1</h4>' : '<h3>$1</h3>');
    
    // 处理\paragraph{标题}
    processed = processed.replace(/\\paragraph\{([^}]+)\}/g, '<h5>$1</h5>');
    
    // 处理\subparagraph{标题}
    processed = processed.replace(/\\subparagraph\{([^}]+)\}/g, '<h6>$1</h6>');
    
    // 处理\textbf{文本} - 粗体
    processed = processed.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
    
    // 处理\textit{文本} - 斜体
    processed = processed.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>');
    
    // 处理\underline{文本} - 下划线
    processed = processed.replace(/\\underline\{([^}]+)\}/g, '<u>$1</u>');
    
    // 处理\texttt{文本} - 等宽字体
    processed = processed.replace(/\\texttt\{([^}]+)\}/g, '<code>$1</code>');
    
    // 处理\textsl{文本} - 倾斜
    processed = processed.replace(/\\textsl\{([^}]+)\}/g, '<i>$1</i>');
    
    // 处理\textsf{文本} - 无衬线
    processed = processed.replace(/\\textsf\{([^}]+)\}/g, '<span style="font-family:sans-serif;">$1</span>');
    
    // 处理\textrm{文本} - 罗马字体
    processed = processed.replace(/\\textrm\{([^}]+)\}/g, '<span style="font-family:serif;">$1</span>');
    
    // 处理\centering - 居中
    processed = processed.replace(/\\centering/g, '<div style="text-align:center;">');
    
    // 处理左对齐
    processed = processed.replace(/\\raggedright/g, '<div style="text-align:left;">');
    
    // 处理右对齐
    processed = processed.replace(/\\raggedleft/g, '<div style="text-align:right;">');
    
    // 处理分页命令
    processed = processed.replace(/\\newpage/g, '<div style="page-break-after:always;"></div>');
    processed = processed.replace(/\\pagebreak/g, '<div style="page-break-after:always;"></div>');
    processed = processed.replace(/\\clearpage/g, '<div style="page-break-after:always;"></div>');
    
    // 处理水平线
    processed = processed.replace(/\\hline/g, '<hr>');
    
    // 处理分隔线
    processed = processed.replace(/\\HRule/g, '<hr style="border:1px solid #ccc;">');
    
    // 处理\item列表项
    processed = processed.replace(/\\item\s+([^\n]+)/g, '<li>$1</li>');
    
    // 处理\item（无内容）
    processed = processed.replace(/\\item(?!\s)/g, '<li></li>');
    
    // 处理\begin{itemize}...\end{itemize}
    processed = processed.replace(/\\begin{itemize}([\s\S]*?)\\end{itemize}/g, '<ul>$1</ul>');
    
    // 处理\begin{enumerate}...\end{enumerate}
    processed = processed.replace(/\\begin{enumerate}([\s\S]*?)\\end{enumerate}/g, '<ol>$1</ol>');
    
    // 处理\begin{description}...\end{description}
    processed = processed.replace(/\\begin{description}([\s\S]*?)\\end{description}/g, '<dl>$1</dl>');
    
    // 处理列表项（带方括号标签）
    processed = processed.replace(/\\item\[([^\]]+)\]/g, '<dt>$1</dt><dd>');
    
    // 处理表格
    processed = processed.replace(/\\begin{tabular}\{([^}]+)\}([\s\S]*?)\\end{tabular}/g, function(match, cols, content) {
        return generateTableHTML(cols, content);
    });
    
    // 处理表格环境
    processed = processed.replace(/\\begin{table}([\s\S]*?)\\end{table}/g, '<div class="table-container">$1</div>');
    
    // 处理图片环境
    processed = processed.replace(/\\begin{figure}([\s\S]*?)\\end{figure}/g, '<div class="figure-container">$1</div>');
    
    // 处理\caption{标题}
    processed = processed.replace(/\\caption\{([^}]+)\}/g, '<div class="caption">$1</div>');
    
    // 处理\label{标签}
    processed = processed.replace(/\\label\{([^}]+)\}/g, '<span class="label" id="label-$1">[$1]</span>');
    
    // 处理\ref{标签}
    processed = processed.replace(/\\ref\{([^}]+)\}/g, '<a href="#label-$1" class="ref">[$1]</a>');
    
    // 处理页码引用
    processed = processed.replace(/\\pageref\{([^}]+)\}/g, '<span class="pageref">第$1页</span>');
    
    // 处理脚注
    processed = processed.replace(/\\footnote\{([^}]+)\}/g, '<sup class="footnote">[$1]</sup>');
    
    // 处理引用
    processed = processed.replace(/\\begin{quote}([\s\S]*?)\\end{quote}/g, '<blockquote>$1</blockquote>');
    
    // 处理 verbatim 环境（代码块）
    processed = processed.replace(/\\begin{verbatim}([\s\S]*?)\\end{verbatim}/g, '<pre><code>$1</code></pre>');
    
    // 处理 center 环境
    processed = processed.replace(/\\begin{center}([\s\S]*?)\\end{center}/g, '<div style="text-align:center;">$1</div>');
    
    // 处理 spacing 命令
    processed = processed.replace(/\\smallskip/g, '<div style="margin:0.5rem 0;"></div>');
    processed = processed.replace(/\\bigskip/g, '<div style="margin:1.5rem 0;"></div>');
    processed = processed.replace(/\\vspace\{([^}]+)\}/g, '<div style="height:$1;"></div>');
    processed = processed.replace(/\\hspace\{([^}]+)\}/g, '<span style="display:inline-block;width:$1;"></span>');
    
    // 处理空行
    processed = processed.replace(/\\par/g, '<br><br>');
    
    return processed;
}

// 生成表格HTML
function generateTableHTML(colSpec, content) {
    let html = '<table class="latex-table">';
    
    // 解析列对齐方式
    const cols = colSpec.split('').filter(c => c !== '|');
    const colAligns = cols.map(col => {
        if (col === 'l') return 'left';
        if (col === 'r') return 'right';
        return 'center';
    });
    
    // 解析表格内容
    const rows = content.split('\\\\').map(row => row.trim()).filter(row => row);
    
    rows.forEach((row, rowIndex) => {
        const cells = row.split('&').map(cell => cell.trim());
        const isHeader = rowIndex === 0 && content.includes('\\hline');
        
        html += '<tr>';
        cells.forEach((cell, cellIndex) => {
            // 移除 \hline
            cell = cell.replace(/\\hline/g, '');
            // 移除 \cline
            cell = cell.replace(/\\cline\{[^}]+\}/g, '');
            
            const tag = isHeader ? 'th' : 'td';
            const align = colAligns[cellIndex] || 'center';
            html += `<${tag} style="text-align:${align};padding:0.5rem;border:1px solid #ddd;">${cell}</${tag}>`;
        });
        html += '</tr>';
    });
    
    html += '</table>';
    return html;
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
    module.exports = { parseMarkdown, htmlToMarkdown, processLatexStructure, generateTableHTML };
}
