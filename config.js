/**
 * 配置模块 - 包含所有全局配置信息
 */

const CONFIG = {
    // API配置
    JSONBIN_API_URL: 'https://api.jsonbin.io/v3/b',
    JSONBIN_MASTER_KEY: '$2a$10$65.YoRtLPFv8FWRwnt1zm.WVgXtmdSmp42kAWTwhf6BbZiwP98D4m',
    
    // 页面配置
    BIN_IDS: {
        'project': '69d355cd856a68218902fd64',
        'team': '69d355fb856a68218902fde8',
        'model': '69d3560c36566621a88262e6',
        'lab': '69d355eaaaba882197cb3d1d',
        'human': '69d3561f856a68218902fe54',
        'parts': '69d3513936566621a8825323',
        'timeline': '69d3561f856a68218902fe54',
        'comments': '69d3561f856a68218902fe54'
    },
    
    // 调试模式 - 设置为true以显示调试信息
    DEBUG_MODE: true,
    
    // 备用数据模式 - 当API不可用时使用本地数据
    USE_FALLBACK_DATA: true,
    
    // 当前页面
    currentPage: 'project',
    
    isEditing: false,
    originalContent: '',
    currentContent: '',
    
    isLoading: false,
    
    currentRequest: null,
    requestedPage: null,
    lastLoadedPage: null,
    
    paperMode: true,
    
    IMAGES: {
        BASE_PATH: 'images/',
        DEFAULT_EXTENSION: 'jpg',
        SYNTAX: {
            PATTERN: /（([a-z]+)（(\d+)），([^）]+)）/g,
            SINGLE: /（([a-z]+)（(\d+)），([^）]+)）/
        }
    },
    
    // 备用数据（当API不可用时使用）
    FALLBACK_DATA: {
        'project': {
            title: '项目总览',
            content: '<h2>欢迎来到北师珠iGEM项目</h2>\n<p>这是一个智能合成生物学平台，致力于创新和探索合成生物学的前沿领域。</p>\n<h3>项目目标</h3>\n<ul>\n<li>开发新型生物传感器</li>\n<li>探索可持续生物技术</li>\n<li>培养未来的合成生物学家</li>\n</ul>',
            features: { timeline: true, comments: true }
        },
        'team': {
            title: '团队介绍',
            content: '<h2>我们的团队</h2>\n<p>北师珠iGEM团队由一群充满热情的学生和导师组成。</p>\n<h3>团队成员</h3>\n<ul>\n<li>指导老师</li>\n<li>项目负责人</li>\n<li>实验室技术员</li>\n<li>数据分析</li>\n</ul>',
            features: { timeline: false, comments: true }
        },
        'model': {
            title: '模型设计',
            content: '<h2>数学模型</h2>\n<p>我们使用先进的数学模型来模拟生物系统的行为。</p>\n<h3>模型类型</h3>\n<ul>\n<li>微分方程模型</li>\n<li>布尔网络模型</li>\n<li>基于Agent的模型</li>\n</ul>',
            features: { timeline: false, comments: false }
        },
        'lab': {
            title: '实验室',
            content: '<h2>实验设施</h2>\n<p>我们拥有先进的实验设备和完善的安全保障。</p>\n<h3>主要设备</h3>\n<ul>\n<li>PCR仪</li>\n<li>测序仪</li>\n<li>显微镜</li>\n<li>生物安全柜</li>\n</ul>',
            features: { timeline: true, comments: false }
        },
        'human': {
            title: '人文实践',
            content: '<h2>人文与社会实践</h2>\n<p>我们不仅关注科学研究，也重视社会责任。</p>\n<h3>活动内容</h3>\n<ul>\n<li>科普讲座</li>\n<li>校园展览</li>\n<li>社区服务</li>\n</ul>',
            features: { timeline: false, comments: true }
        },
        'parts': {
            title: '标准部件',
            content: '<h2>生物标准部件库</h2>\n<p>我们收集和整理了多种标准化的生物部件。</p>\n<h3>部件分类</h3>\n<ul>\n<li>启动子</li>\n<li>编码序列</li>\n<li>终止子</li>\n<li>报告基因</li>\n</ul>',
            features: { timeline: false, comments: false }
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}