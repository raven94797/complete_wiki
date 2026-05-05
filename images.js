/**
 * 图片处理模块 - 处理图片的生成、加载和错误处理
 */

function generateImageHTML(page, number, description) {
    const imageId = `${page}（${number}）`;
    const imageUrl = `${CONFIG.IMAGES.BASE_PATH}${page}/${imageId}.${CONFIG.IMAGES.DEFAULT_EXTENSION}`;
    
    return `
        <div class="content-image-container" data-image-id="${imageId}">
            <img src="${imageUrl}" 
                 alt="${description}"
                 class="content-image"
                 loading="lazy"
                 onerror="handleImageError(this, '${imageId}', '${CONFIG.IMAGES.BASE_PATH}${page}/')">
            <div class="content-image-caption">${description}</div>
        </div>
    `;
}

function handleImageError(img, imageId, basePath) {
    img.onerror = null;
    img.style.display = 'none';
    const container = img.parentElement;
    const fullPath = basePath + imageId + '.' + CONFIG.IMAGES.DEFAULT_EXTENSION;
    container.innerHTML = '<div class="content-image-error">图片未找到: ' + imageId + '<br>请确保图片文件已上传到: ' + fullPath + '</div>';
}

function insertImageSyntax() {
    const editor = document.getElementById('contentEditor');
    if (!editor) return;
    
    const currentPage = CONFIG.currentPage;
    const content = editor.value;
    const pattern = new RegExp(`（${currentPage}（(\\d+)）`, 'g');
    let maxNumber = 0;
    let match;
    
    while ((match = pattern.exec(content)) !== null) {
        const num = parseInt(match[1]);
        if (num > maxNumber) maxNumber = num;
    }
    
    const nextNumber = maxNumber + 1;
    const imageSyntax = `（${currentPage}（${nextNumber}），请输入图片描述）`;
    
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const beforeText = editor.value.substring(0, start);
    const afterText = editor.value.substring(end);
    
    editor.value = beforeText + imageSyntax + afterText;
    editor.focus();
    
    const cursorPos = start + imageSyntax.indexOf('请输入图片描述');
    editor.setSelectionRange(cursorPos, cursorPos + 6);
}

function checkMissingImages() {
    const imageContainers = document.querySelectorAll('.content-image-container');
    
    imageContainers.forEach(container => {
        const img = container.querySelector('img');
        if (img) {
            img.addEventListener('error', function() {
                const imageId = container.dataset.imageId;
                console.warn(`图片加载失败: ${imageId}`);
            });
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateImageHTML, handleImageError, insertImageSyntax, checkMissingImages };
}