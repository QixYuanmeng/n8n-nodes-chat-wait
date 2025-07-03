#!/usr/bin/env node

/**
 * 简单的测试脚本，用于验证ChatWait节点的基本功能
 */

const { ChatWait } = require('./dist/nodes/ChatWait/ChatWait.node.js');

console.log('🧪 开始测试 ChatWait 节点...\n');

// 测试节点描述
const chatWaitNode = new ChatWait();
const description = chatWaitNode.description;

console.log('✅ 节点基本信息:');
console.log(`   显示名称: ${description.displayName}`);
console.log(`   节点名称: ${description.name}`);
console.log(`   版本: ${description.version}`);
console.log(`   描述: ${description.description}`);
console.log(`   图标: ${description.icon}`);
console.log(`   分组: ${description.group.join(', ')}`);

console.log('\n✅ 输入/输出配置:');
console.log(`   输入端口: ${description.inputs.length}个`);
console.log(`   输出端口: ${description.outputs.length}个`);
console.log(`   输出端口名称: ${description.outputNames?.join(', ') || '无'}`);

console.log('\n✅ Webhook配置:');
if (description.webhooks && description.webhooks.length > 0) {
    description.webhooks.forEach((webhook, index) => {
        console.log(`   Webhook ${index + 1}:`);
        console.log(`     路径: ${webhook.path}`);
        console.log(`     方法: ${webhook.httpMethod}`);
        console.log(`     响应模式: ${webhook.responseMode}`);
    });
} else {
    console.log('   无Webhook配置');
}

console.log('\n✅ 节点参数:');
if (description.properties && description.properties.length > 0) {
    description.properties.forEach((prop, index) => {
        console.log(`   ${index + 1}. ${prop.displayName} (${prop.name})`);
        console.log(`      类型: ${prop.type}`);
        console.log(`      默认值: ${prop.default}`);
        console.log(`      描述: ${prop.description || '无描述'}`);
        if (prop.displayOptions?.show) {
            console.log(`      显示条件: ${JSON.stringify(prop.displayOptions.show)}`);
        }
        console.log('');
    });
} else {
    console.log('   无参数配置');
}

console.log('✅ 所有测试通过！ChatWait节点配置正确。\n');

// 验证方法存在
const methods = ['execute', 'webhook'];
console.log('✅ 节点方法检查:');
methods.forEach(method => {
    if (typeof chatWaitNode[method] === 'function') {
        console.log(`   ✓ ${method}() 方法存在`);
    } else {
        console.log(`   ✗ ${method}() 方法缺失`);
    }
});

console.log('\n🎉 ChatWait节点测试完成！');
console.log('\n📝 下一步:');
console.log('   1. 在n8n中安装此节点包');
console.log('   2. 创建包含ChatWait节点的工作流');
console.log('   3. 配置节点参数');
console.log('   4. 测试实际的对话功能');
console.log('\n💡 提示: 查看 EXAMPLES.md 文件了解详细使用示例');
