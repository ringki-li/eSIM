// 包含完整前端页面的 HTML 模板字符串
// 注意：前端代码中的 `${}` 和反引号已被安全转义，以确保 Worker 能正确解析
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eSIM 资产与保号看板</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
            background-size: 400% 400%;
            animation: gradient 15s ease infinite;
            min-height: 100vh;
        }
        @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        .glass-panel {
            background: rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.5);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .glass-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .modal-enter { opacity: 0; transform: scale(0.9); }
        .modal-enter-active { opacity: 1; transform: scale(1); transition: all 0.3s ease; }
    </style>
</head>
<body class="text-gray-800 font-sans p-4 md:p-8 relative">

    <div class="max-w-6xl mx-auto glass-panel rounded-3xl p-6 md:p-10 mt-4 md:mt-8">
        <!-- 头部信息 -->
        <div class="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-white/50 pb-6 gap-4">
            <div>
                <h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                    <i class="fa-solid fa-sim-card text-blue-600"></i>
                    eSIM 保号看板
                </h1>
                <p class="text-gray-700 mt-2 font-medium">自动监控卡片有效期，15天内触发 Telegram 提醒。</p>
            </div>
            <div class="flex gap-3 items-center">
                <span class="text-sm bg-white/50 px-4 py-2 rounded-full font-semibold shadow-sm hidden md:inline-block">
                    今日：<span id="current-date" class="text-blue-700">...</span>
                </span>
                <button onclick="openModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-bold shadow-lg transition-colors flex items-center gap-2">
                    <i class="fa-solid fa-plus"></i> 添加号码
                </button>
            </div>
        </div>

        <!-- 状态统计 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10" id="stats-container">
            <!-- JS 动态注入 -->
        </div>

        <!-- 卡片列表容器 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="esim-container">
            <div class="col-span-full text-center py-10 text-gray-700 font-medium text-lg" id="loading-text">
                <i class="fa-solid fa-spinner fa-spin mr-2"></i> 正在连接数据库...
            </div>
        </div>
    </div>

    <!-- 添加卡片模态框 -->
    <div id="addModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
        <div class="glass-card w-full max-w-md rounded-2xl p-6 shadow-2xl relative transition-all duration-300 transform scale-95 opacity-0" id="modalContent">
            <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <h3 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <i class="fa-solid fa-file-circle-plus text-blue-600"></i> 新增 eSIM
            </h3>
            
            <form id="addForm" onsubmit="submitForm(event)">
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2">卡片名称 (必填)</label>
                    <input type="text" id="simName" required placeholder="例如：KnowRoaming" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80">
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2">手机号码 (选填)</label>
                    <input type="text" id="simNumber" placeholder="例如：+1 234 567 8900" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80">
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2">保号周期 (单位：天，必填)</label>
                    <input type="number" id="simCycle" required placeholder="例如：180" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80">
                </div>
                <div class="mb-6">
                    <label class="block text-gray-700 text-sm font-bold mb-2">本次到期日 (必填)</label>
                    <input type="date" id="simExpire" required class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80">
                </div>
                <button type="submit" id="submitBtn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors">
                    保存并监控
                </button>
            </form>
        </div>
    </div>

    <script>
        // ==========================================
        // 因为前端和后端在同一个域名下，所以直接使用相对路径即可调用 API！
        // ==========================================
        const WORKER_API_URL = "/api/esims";
        
        let esimData = []; 

        document.getElementById('current-date').innerText = new Date().toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        fetchEsimData();

        async function fetchEsimData() {
            const container = document.getElementById('esim-container');
            container.innerHTML = \`<div class="col-span-full text-center py-10 text-gray-700 font-medium text-lg"><i class="fa-solid fa-spinner fa-spin mr-2"></i> 正在加载数据...</div>\`;
            try {
                const response = await fetch(WORKER_API_URL);
                if (!response.ok) throw new Error("网络请求失败");
                esimData = await response.json();
                renderCards(esimData);
            } catch (error) {
                console.error("加载失败:", error);
                container.innerHTML = \`
                    <div class="col-span-full text-center py-10">
                        <i class="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-3"></i>
                        <h3 class="text-xl font-bold text-gray-800">连接数据库失败</h3>
                        <p class="text-gray-600 mt-2">系统内部错误，请检查 Cloudflare KV 绑定状态。</p>
                    </div>\`;
            }
        }

        function renderCards(esims) {
            const container = document.getElementById('esim-container');
            const statsContainer = document.getElementById('stats-container');
            container.innerHTML = ''; 

            let safeCount = 0;
            let warningCount = 0;
            let dangerCount = 0;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if(esims.length === 0) {
                container.innerHTML = \`<div class="col-span-full text-center py-16 text-gray-500"><i class="fa-solid fa-box-open text-4xl mb-3"></i><p>还没有添加任何号码，点击右上角添加吧！</p></div>\`;
            }

            esims.sort((a, b) => new Date(a.expireDate) - new Date(b.expireDate));

            esims.forEach(sim => {
                const expDate = new Date(sim.expireDate);
                expDate.setHours(0, 0, 0, 0);
                const diffTime = expDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let statusColor = "bg-green-500";
                let statusText = "状态安全";
                let badgeClass = "bg-green-100 text-green-800";
                let icon = "fa-check-circle text-green-500";

                if (diffDays <= 0) {
                    statusColor = "bg-gray-500";
                    statusText = diffDays === 0 ? "今日到期" : "已过期";
                    badgeClass = "bg-gray-100 text-gray-800";
                    icon = "fa-times-circle text-gray-500";
                    dangerCount++;
                } else if (diffDays <= 15) {
                    statusColor = "bg-red-500";
                    statusText = "即将过期";
                    badgeClass = "bg-red-100 text-red-800";
                    icon = "fa-triangle-exclamation text-red-500";
                    dangerCount++;
                } else if (diffDays <= 45) {
                    statusColor = "bg-yellow-400";
                    statusText = "建议关注";
                    badgeClass = "bg-yellow-100 text-yellow-800";
                    icon = "fa-bell text-yellow-500";
                    warningCount++;
                } else {
                    safeCount++;
                }

                let percent = Math.min(Math.max((diffDays / 365) * 100, 0), 100);

                const cardHTML = \`
                    <div class="glass-card rounded-2xl p-6 relative overflow-hidden group">
                        
                        <!-- 一键续期按钮 (Hover时显示) -->
                        <button onclick="renewEsim('\${sim.id}', \${sim.cycle || 0})" class="absolute top-4 right-14 text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10" title="一键续期（按周期顺延）">
                            <i class="fa-solid fa-rotate-right text-sm"></i>
                        </button>

                        <!-- 删除按钮 (Hover时显示) -->
                        <button onclick="deleteEsim('\${sim.id}')" class="absolute top-4 right-4 text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 w-8 h-8 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10" title="删除号码">
                            <i class="fa-solid fa-trash-can text-sm"></i>
                        </button>

                        <div class="flex justify-between items-start mb-4 pr-16">
                            <div>
                                <h2 class="text-xl font-bold text-gray-900 truncate max-w-[150px] md:max-w-[170px]">\${sim.name}</h2>
                                <p class="text-gray-600 font-mono mt-1 text-sm"><i class="fa-solid fa-phone-alt mr-1 text-gray-400"></i>\${sim.number || '未登记号码'}</p>
                            </div>
                            <span class="px-3 py-1 rounded-full text-xs font-bold shadow-sm whitespace-nowrap \${badgeClass}">
                                <i class="fa-solid \${icon} mr-1"></i>\${statusText}
                            </span>
                        </div>
                        
                        <div class="mt-6">
                            <div class="flex justify-between text-sm font-semibold mb-2">
                                <span class="text-gray-700">剩余时间</span>
                                <span class="text-gray-900 font-bold \${diffDays <= 15 && diffDays > 0 ? 'text-red-600 animate-pulse' : ''}">\${diffDays < 0 ? '0' : diffDays} 天</span>
                            </div>
                            <div class="w-full bg-gray-200/60 rounded-full h-3 mb-2 shadow-inner">
                                <div class="\${statusColor} h-3 rounded-full shadow-sm transition-all duration-1000" style="width: \${percent}%"></div>
                            </div>
                            <div class="flex justify-between text-xs text-gray-500 mt-2 font-medium">
                                <span><i class="fa-solid fa-arrows-rotate mr-1"></i>周期: \${sim.cycle || '-'} 天</span>
                                <span>到期日: \${sim.expireDate}</span>
                            </div>
                        </div>
                    </div>
                \`;
                container.innerHTML += cardHTML;
            });

            statsContainer.innerHTML = \`
                <div class="glass-card rounded-2xl p-5 flex items-center justify-between border-l-4 border-l-green-500">
                    <div>
                        <p class="text-gray-500 text-sm font-bold uppercase">安全卡片 (>45天)</p>
                        <p class="text-3xl font-black text-gray-800 mt-1">\${safeCount}</p>
                    </div>
                    <i class="fa-solid fa-shield-check text-4xl text-green-200"></i>
                </div>
                <div class="glass-card rounded-2xl p-5 flex items-center justify-between border-l-4 border-l-yellow-400">
                    <div>
                        <p class="text-gray-500 text-sm font-bold uppercase">建议关注 (<45天)</p>
                        <p class="text-3xl font-black text-gray-800 mt-1">\${warningCount}</p>
                    </div>
                    <i class="fa-solid fa-clock text-4xl text-yellow-200"></i>
                </div>
                <div class="glass-card rounded-2xl p-5 flex items-center justify-between border-l-4 border-l-red-500">
                    <div>
                        <p class="text-gray-500 text-sm font-bold uppercase">告警/过期 (<=15天)</p>
                        <p class="text-3xl font-black text-gray-800 mt-1">\${dangerCount}</p>
                    </div>
                    <i class="fa-solid fa-siren-on text-4xl text-red-200"></i>
                </div>
            \`;
        }

        async function submitForm(e) {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>保存中...';
            btn.disabled = true;

            const payload = {
                name: document.getElementById('simName').value,
                number: document.getElementById('simNumber').value,
                cycle: parseInt(document.getElementById('simCycle').value) || 0,
                expireDate: document.getElementById('simExpire').value
            };

            try {
                const response = await fetch(WORKER_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (response.ok) {
                    closeModal();
                    await fetchEsimData(); 
                } else {
                    alert("保存失败，请检查 Worker 配置。");
                }
            } catch (error) {
                alert("网络错误，保存失败。");
            } finally {
                btn.innerHTML = '保存并监控';
                btn.disabled = false;
            }
        }

        // 一键续期功能
        async function renewEsim(id, cycle) {
            if (!cycle || cycle === 0) {
                alert("该卡片未设置保号周期，无法自动计算日期。请删除后重新添加。");
                return;
            }
            if (!confirm("确定已保号并一键续期吗？\\n\\n系统将以【今天】为基准，往后顺延 " + cycle + " 天作为新的到期日。")) return;
            
            // 计算基于今天的新日期
            const newDate = new Date();
            newDate.setDate(newDate.getDate() + parseInt(cycle));
            const year = newDate.getFullYear();
            const month = String(newDate.getMonth() + 1).padStart(2, '0');
            const day = String(newDate.getDate()).padStart(2, '0');
            const newExpireStr = year + '-' + month + '-' + day;

            try {
                const response = await fetch(WORKER_API_URL, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id, expireDate: newExpireStr })
                });
                
                if (response.ok) {
                    await fetchEsimData(); 
                } else {
                    alert("续期失败。");
                }
            } catch (error) {
                alert("网络错误，续期失败。");
            }
        }

        async function deleteEsim(id) {
            if (!confirm("确定要删除这个号码记录吗？")) return;
            
            try {
                const response = await fetch(WORKER_API_URL, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id })
                });
                
                if (response.ok) {
                    await fetchEsimData(); 
                } else {
                    alert("删除失败。");
                }
            } catch (error) {
                alert("网络错误，删除失败。");
            }
        }

        function openModal() {
            const modal = document.getElementById('addModal');
            const content = document.getElementById('modalContent');
            document.getElementById('addForm').reset(); 
            
            modal.classList.remove('hidden');
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        function closeModal() {
            const modal = document.getElementById('addModal');
            const content = document.getElementById('modalContent');
            
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300); 
        }
    </script>
</body>
</html>`;

export default {
  // 核心入口：拦截所有网络请求并进行路由分发
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 路由 1：如果访问的是根目录 (网址首页)，直接返回 HTML 网页
    if (path === "/" || path === "/index.html") {
      return new Response(HTML_CONTENT, {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    }

    // 路由 2：如果访问的是 API 接口 (/api/esims)，则处理数据库数据
    if (path === "/api/esims") {
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      };

      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      let esims;
      try {
        esims = await env.ESIM_DB.get("esim_list", { type: "json" });
        if (!esims) esims = []; 
      } catch (err) {
        return new Response(JSON.stringify({ error: "KV 未绑定" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      if (request.method === "GET") {
        return new Response(JSON.stringify(esims), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      if (request.method === "POST") {
        try {
          const newSim = await request.json();
          if (!newSim.name || !newSim.expireDate) {
            return new Response(JSON.stringify({ success: false, message: "参数错误" }), { status: 400, headers: corsHeaders });
          }
          newSim.id = Date.now().toString(); 
          esims.push(newSim);
          await env.ESIM_DB.put("esim_list", JSON.stringify(esims)); 
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) {
          return new Response(JSON.stringify({ success: false }), { status: 400, headers: corsHeaders });
        }
      }

      // 新增 [PUT] 方法，用于处理一键续期
      if (request.method === "PUT") {
        try {
          const { id, expireDate } = await request.json();
          let found = false;
          esims = esims.map(sim => {
            if (sim.id === id) {
              found = true;
              return { ...sim, expireDate }; // 只更新到期日期
            }
            return sim;
          });

          if (!found) {
            return new Response(JSON.stringify({ success: false, message: "未找到记录" }), { status: 404, headers: corsHeaders });
          }

          await env.ESIM_DB.put("esim_list", JSON.stringify(esims)); 
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) {
          return new Response(JSON.stringify({ success: false }), { status: 400, headers: corsHeaders });
        }
      }

      if (request.method === "DELETE") {
        try {
          const { id } = await request.json();
          esims = esims.filter(sim => sim.id !== id);
          await env.ESIM_DB.put("esim_list", JSON.stringify(esims)); 
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) {
          return new Response(JSON.stringify({ success: false }), { status: 400, headers: corsHeaders });
        }
      }
    }

    return new Response("404 Not Found", { status: 404 });
  },

  // 定时任务逻辑 (新增了周期数据显示在 TG 提醒中)
  async scheduled(event, env, ctx) {
    const esims = await env.ESIM_DB.get("esim_list", { type: "json" });
    if (!esims || esims.length === 0) return; 

    const today = new Date();
    const offset = 8; // 东八区
    const localToday = new Date(today.getTime() + offset * 3600 * 1000);
    localToday.setUTCHours(0, 0, 0, 0);

    let messages = [];

    esims.forEach(sim => {
      const expDate = new Date(sim.expireDate);
      expDate.setUTCHours(0, 0, 0, 0); 
      
      const diffTime = expDate - localToday;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // 显示保号周期文字
      const cycleText = sim.cycle ? `${sim.cycle}天` : '未设置';

      if (diffDays <= 15 && diffDays > 0) {
        messages.push(`⚠️ 【eSIM 保号提醒】\n📱 卡名: ${sim.name}\n📞 号码: ${sim.number || '未填写'}\n🔄 周期: ${cycleText}\n📅 到期: ${sim.expireDate}\n⏳ 剩余: ${diffDays} 天！\n👉 请尽快处理续期！`);
      } else if (diffDays === 0) {
        messages.push(`🚨 【eSIM 紧急提醒】\n📱 卡名: ${sim.name} 今天到期！`);
      } else if (diffDays < 0 && Math.abs(diffDays) % 7 === 0) {
        messages.push(`❌ 【eSIM 停机警告】\n📱 卡名: ${sim.name} 已过期 ${Math.abs(diffDays)} 天。`);
      }
    });

    if (messages.length > 0 && env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
      const text = messages.join("\n\n---\n\n");
      const tgUrl = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`;
      await fetch(tgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chat_id: env.TG_CHAT_ID, 
          text: text, 
          parse_mode: "HTML" 
        })
      });
    }
  }
};
