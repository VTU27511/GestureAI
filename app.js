// ==========================================================================
// GATEway AI - Core Application Script
// Features: Navigation, AI Integration, Quiz, Formula Hub, Study Planner
// ==========================================================================

// Global App State
let state = {
  apiKey: "",
  activeBranch: "CS",
  solvedQuestions: {}, // format: { qId: { attempted: true, isCorrect: true, userAnswers: ... } }
  aiQueriesCount: 0,
  streak: 3,
  chatHistory: [],
  planner: null
};

// DOM Elements
const navLinks = document.querySelectorAll('.nav-link');
const screens = document.querySelectorAll('.screen-section');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('api-status-text');
const apiModal = document.getElementById('api-modal');
const apiKeyInput = document.getElementById('api-key-input');
const keyEyeIcon = document.getElementById('api-key-eye');

// Chart holder
let masteryChart = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initNavigation();
  initChat();
  initPractice();
  initFormulas();
  initPlanner();
  updateDashboardStats();
  checkSearchQuery();
  
  // Initial render of icons
  lucide.createIcons();
});

// Load state from local storage
function loadState() {
  const savedState = localStorage.getItem('gateway_ai_state');
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      state = { ...state, ...parsed };
    } catch (e) {
      console.error("Error parsing saved state", e);
    }
  }

  // Load API Key
  state.apiKey = localStorage.getItem('gateway_gemini_key') || "";
  
  // Update UI indicators
  updateApiStatusUI();
  updateStreakUI();
}

// Save state to local storage
function saveState() {
  localStorage.setItem('gateway_ai_state', JSON.stringify({
    activeBranch: state.activeBranch,
    solvedQuestions: state.solvedQuestions,
    aiQueriesCount: state.aiQueriesCount,
    streak: state.streak,
    chatHistory: state.chatHistory,
    planner: state.planner
  }));
}

// Navigation Tab Switching
function initNavigation() {
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-target');
      switchTab(target);
    });
  });

  // Branch selector changed
  const branchSelect = document.getElementById('branch-select');
  branchSelect.value = state.activeBranch;
  branchSelect.addEventListener('change', (e) => {
    state.activeBranch = e.target.value;
    saveState();
    
    // Regenerate planner if active
    if (state.planner) {
      document.getElementById('plan-branch').value = state.activeBranch;
      generateStudyPlan();
    }
    
    // Update dashboard visual indications
    updateDashboardStats();
  });

  // Global search input handling
  const searchInput = document.getElementById('global-search');
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value.trim();
      if (query.length > 0) {
        // Go to Formula screen and filter formulas
        switchTab('formulas');
        const formulaSearch = document.getElementById('formula-search');
        formulaSearch.value = query;
        filterFormulas(query);
      }
    }
  });

  // API Status click opens modal
  document.getElementById('api-status-btn').addEventListener('click', openApiModal);
}

function switchTab(tabId) {
  // Update Nav Links active state
  navLinks.forEach(l => {
    if (l.getAttribute('data-target') === tabId) {
      l.classList.add('active');
    } else {
      l.classList.remove('active');
    }
  });

  // Update screens visibility
  screens.forEach(s => {
    if (s.getAttribute('id') === tabId) {
      s.classList.add('active-screen');
    } else {
      s.classList.remove('active-screen');
    }
  });

  // Specific tab initializations
  if (tabId === 'dashboard') {
    updateDashboardStats();
  } else if (tabId === 'formulas') {
    renderFormulas();
  }

  lucide.createIcons();
}

// API Config Modal Actions
function updateApiStatusUI() {
  if (state.apiKey) {
    statusDot.classList.add('active');
    statusText.textContent = "Connected (Gemini)";
    statusText.style.color = "var(--success)";
    
    const taskApi = document.getElementById('task-api');
    if (taskApi) taskApi.classList.add('done');
  } else {
    statusDot.classList.remove('active');
    statusText.textContent = "Not Configured";
    statusText.style.color = "var(--text-muted)";
    
    const taskApi = document.getElementById('task-api');
    if (taskApi) taskApi.classList.remove('done');
  }
}

function updateStreakUI() {
  const counter = document.getElementById('streak-counter');
  if (counter) {
    counter.textContent = `${state.streak} Days Streak`;
  }
}

function openApiModal() {
  apiModal.classList.remove('hidden');
  apiKeyInput.value = state.apiKey;
  lucide.createIcons();
}

function closeApiModal() {
  apiModal.classList.add('hidden');
}

function toggleApiKeyVisibility() {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    keyEyeIcon.setAttribute('data-lucide', 'eye-off');
  } else {
    apiKeyInput.type = 'password';
    keyEyeIcon.setAttribute('data-lucide', 'eye');
  }
  lucide.createIcons();
}

function saveApiKey() {
  const key = apiKeyInput.value.trim();
  state.apiKey = key;
  localStorage.setItem('gateway_gemini_key', key);
  updateApiStatusUI();
  closeApiModal();
  
  // Hide nag box in chat if key is configured
  const nag = document.getElementById('chat-api-nag');
  if (nag && key) {
    nag.classList.add('hidden');
  }
}

// Dashboard Statistics Updates & Chart Rendering
function updateDashboardStats() {
  const solvedCount = Object.keys(state.solvedQuestions).length;
  const totalQuestions = GATE_QUESTIONS.length;
  
  document.getElementById('stats-solved').textContent = `${solvedCount}/${totalQuestions}`;
  document.getElementById('stats-solved-percentage').textContent = 
    totalQuestions > 0 ? `${Math.round((solvedCount / totalQuestions) * 100)}%` : "0%";

  const correctAttempts = Object.values(state.solvedQuestions).filter(q => q.isCorrect).length;
  const statsAccuracy = document.getElementById('stats-accuracy');
  if (solvedCount > 0) {
    statsAccuracy.textContent = `${Math.round((correctAttempts / solvedCount) * 100)}%`;
  } else {
    statsAccuracy.textContent = "N/A";
  }

  document.getElementById('stats-queries').textContent = state.aiQueriesCount;

  // Study hours display
  const statsHours = document.getElementById('stats-hours');
  const plannerStatus = document.getElementById('stats-planner-status');
  if (state.planner) {
    statsHours.textContent = `${state.planner.dailyHours} hrs/day`;
    plannerStatus.textContent = "Planner Active";
    plannerStatus.style.color = "var(--success)";
    
    const taskPlanner = document.getElementById('task-planner');
    if (taskPlanner) taskPlanner.classList.add('done');
  } else {
    statsHours.textContent = "N/A";
    plannerStatus.textContent = "Planner not set";
    plannerStatus.style.color = "var(--text-muted)";
    
    const taskPlanner = document.getElementById('task-planner');
    if (taskPlanner) taskPlanner.classList.remove('done');
  }

  // Task checklist check
  const taskQuiz = document.getElementById('task-quiz');
  if (taskQuiz) {
    if (solvedCount > 0) {
      taskQuiz.classList.add('done');
    } else {
      taskQuiz.classList.remove('done');
    }
  }

  renderDashboardChart();
}

function renderDashboardChart() {
  const ctx = document.getElementById('masteryChart').getContext('2d');
  
  // Calculate category strengths based on answers
  const categories = {};
  // Initialize standard subjects
  const defaultSubjects = ["Operating Systems", "Algorithms", "Database Management Systems", "Computer Networks", "Theory of Computation", "Engineering Mathematics"];
  defaultSubjects.forEach(s => {
    categories[s] = { total: 0, correct: 0 };
  });

  // Count question distributions
  GATE_QUESTIONS.forEach(q => {
    if (!categories[q.subject]) {
      categories[q.subject] = { total: 0, correct: 0 };
    }
    categories[q.subject].total++;
    
    if (state.solvedQuestions[q.id]) {
      if (state.solvedQuestions[q.id].isCorrect) {
        categories[q.subject].correct++;
      }
    }
  });

  const labels = Object.keys(categories);
  const dataCorrect = labels.map(l => categories[l].correct);
  const dataTotal = labels.map(l => categories[l].total);

  if (masteryChart) {
    masteryChart.destroy();
  }

  // Draw chart
  masteryChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.map(l => l.length > 15 ? l.substring(0, 15) + '...' : l),
      datasets: [
        {
          label: 'Mastered (Correct)',
          data: dataCorrect,
          backgroundColor: 'rgba(99, 102, 241, 0.65)',
          borderColor: '#6366f1',
          borderWidth: 1.5,
          borderRadius: 4
        },
        {
          label: 'Total Available',
          data: dataTotal,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1.5,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#9ca3af', font: { size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#9ca3af', precision: 0 },
          beginAtZero: true
        }
      },
      plugins: {
        legend: {
          labels: { color: '#f3f4f6', font: { size: 11 } }
        }
      }
    }
  });
}

// ==========================================================================
// CHAT: GATE Guru AI Tutor
// ==========================================================================

// Predefined offline helper answers database
const OFFLINE_EXPERT_RESPONSES = {
  "3nf": `### Database Normalization: 3NF vs BCNF

In relational database design, **Third Normal Form (3NF)** and **Boyce-Codd Normal Form (BCNF)** are rules to eliminate data redundancy and anomalies.

#### 1. Third Normal Form (3NF)
A relation $R$ is in 3NF if and only if, for every non-trivial functional dependency $X \\rightarrow Y$:
*   Either $X$ is a **Super Key**,
*   Or $Y$ is a **Prime Attribute** (belongs to some candidate key).

*Intuitively, 3NF ensures there are no transitive dependencies of non-prime attributes on candidate keys.*

#### 2. Boyce-Codd Normal Form (BCNF)
A relation $R$ is in BCNF (a stronger version of 3NF) if and only if, for every non-trivial functional dependency $X \\rightarrow Y$:
*   $X$ is a **Super Key**.

*In BCNF, we eliminate the 'or prime attribute' loop-hole. Every determinant must be a candidate key.*

---

#### Comparison Example:
Consider relation $R(S, S\\_ID, P)$ representing student enrollment:
*   $S$: Student Name
*   $S\\_ID$: Student ID
*   $P$: Phone Number

Suppose functional dependencies are:
1.  $S\\_ID \\rightarrow S$ (Student ID determines Name)
2.  $S \\rightarrow S\\_ID$ (Name determines ID, assuming unique names)

Here, both $\\{S\\}$ and $\\{S\\_ID\\}$ are Candidate Keys.
*   **Is it in 3NF?** Yes. For $S\\_ID \\rightarrow S$, the left side is a key. For $S \\rightarrow S\\_ID$, the left side is also a key.
*   If we add a third attribute $P$ and $S\\_ID \\rightarrow P$ and $P \\rightarrow S$. Since $P$ is not a key, but $S$ is a prime attribute, the dependency $P \\rightarrow S$ satisfies 3NF because $S$ is prime. However, it violates BCNF because $P$ is not a super key.`,

  "masters": `### Master's Theorem for Recurrence Relations

Master's Theorem provides a direct mathematical solution for divide-and-conquer recurrences of the form:
$$T(n) = aT(n/b) + f(n)$$
where $a \\ge 1$, $b > 1$, and $f(n)$ is an asymptotically positive function.

We compare $f(n)$ with $n^{\\log_b a}$ to determine the time complexity:

#### Case 1: High Overhead in Subproblems
If $f(n) = O(n^{\\log_b a - \\epsilon})$ for some constant $\\epsilon > 0$, then:
$$T(n) = \\Theta(n^{\\log_b a})$$
*Example:* $T(n) = 8T(n/2) + n^2 \\implies \\log_2 8 = 3$. Comparing $n^2$ vs $n^3$, subproblems dominate. $T(n) = \\Theta(n^3)$.

#### Case 2: Even Distribution
If $f(n) = \\Theta(n^{\\log_b a} \\log^k n)$ for some $k \\ge 0$, then:
$$T(n) = \\Theta(n^{\\log_b a} \\log^{k+1} n)$$
*Example:* $T(n) = 2T(n/2) + n \\implies \\log_2 2 = 1$. Comparing $n$ vs $n^1$. They are equal ($k=0$). $T(n) = \\Theta(n \\log n)$.

#### Case 3: High Overhead in Combine Step
If $f(n) = \\Omega(n^{\\log_b a + \\epsilon})$ for some constant $\\epsilon > 0$, and if $a f(n/b) \\le c f(n)$ for some constant $c < 1$ (regularity condition), then:
$$T(n) = \\Theta(f(n))$$
*Example:* $T(n) = 2T(n/2) + n^2 \\implies \\log_2 2 = 1$. $n^2$ is larger than $n^1$. $T(n) = \\Theta(n^2)$.`,

  "sliding": `### Sliding Window Protocol Efficiency

In Computer Networks, the efficiency of sliding window flow control protocols (Go-Back-N, Selective Repeat) is derived by analyzing channel utilization.

#### The Equation:
$$\\eta = \\frac{N \\cdot T_f}{T_f + 2T_p} = \\frac{N}{1 + 2a}$$

Where:
*   $N$: Window Size (number of packets sent before waiting for acknowledgement)
*   $T_f$: Transmission Delay ($T_f = \\frac{L}{B}$ where $L$ is packet length and $B$ is bandwidth)
*   $T_p$: Propagation Delay ($T_p = \\frac{d}{v}$ where $d$ is distance and $v$ is signal propagation velocity)
*   $a$: Ratio of propagation to transmission delay ($a = \\frac{T_p}{T_f}$)

#### Impact of Propagation Delay:
*   **Stop-and-Wait ($N = 1$):** As $T_p$ increases (long distance, like satellite networks), $a$ becomes large, and efficiency $\\eta = \\frac{1}{1+2a}$ drops drastically.
*   **Optimal Window Size:** To achieve $100\\%$ efficiency, we require:
    $$N \\ge 1 + 2a$$
    This is why we scale up the sender window $N$ in high propagation delay links (large Bandwidth-Delay Product).`,

  "dijkstra": `### Dijkstra's Single Source Shortest Path Algorithm

Dijkstra's algorithm finds the shortest path from a starting vertex to all other vertices in a weighted graph with **non-negative edge weights**.

#### Algorithm Steps:
1.  **Initialize**:
    *   Set distance to starting node = $0$.
    *   Set distance to all other nodes = $\\infty$.
    *   Mark all nodes as unvisited. Set the starting node as the active node.
2.  **Evaluate Neighbors**:
    *   For the current active node, check all its unvisited neighbors.
    *   Calculate their tentative distance: $D_{\\text{tentative}} = D_{\\text{current}} + \\text{Weight}(e)$.
    *   If $D_{\\text{tentative}} < D_{\\text{recorded}}$, update the shortest distance.
3.  **Select Next Node**:
    *   Mark the active node as visited (it will not be processed again).
    *   Select the unvisited node with the smallest tentative distance and set it as the new active node.
4.  **Repeat**: Repeat steps 2 and 3 until all nodes are marked visited.

#### Complexity:
*   Using simple array: $O(V^2)$
*   Using Binary Heap: $O((V + E) \\log V)$
*   Using Fibonacci Heap: $O(E + V \\log V)$ (best asymptotic bounds)`
};

function initChat() {
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-chat-btn');
  const clearBtn = document.getElementById('clear-chat-btn');
  const promptChips = document.querySelectorAll('.prompt-chip');

  // Send message on click
  sendBtn.addEventListener('click', () => {
    handleUserSendMessage();
  });

  // Send message on Enter (but Shift+Enter makes newline)
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserSendMessage();
    }
  });

  // Clear chat
  clearBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear this conversation?")) {
      const container = document.getElementById('chat-messages-container');
      container.innerHTML = `
        <div class="message system-message">
          <div class="msg-avatar"><i data-lucide="bot"></i></div>
          <div class="msg-bubble">
            <p>Namaste! Chat history cleared. What engineering concept should we cover next?</p>
          </div>
        </div>
      `;
      state.chatHistory = [];
      saveState();
      lucide.createIcons();
    }
  });

  // Prompt chips setup
  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      chatInput.value = prompt;
      handleUserSendMessage();
    });
  });

  // Persona selector change listener
  const personaSelect = document.getElementById('persona-select');
  personaSelect.addEventListener('change', (e) => {
    const persona = e.target.value;
    const statusDesc = document.querySelector('.agent-status');
    const agentAvatar = document.querySelector('.agent-avatar');
    
    if (persona === 'general') {
      statusDesc.innerHTML = `<span class="pulse-indicator"></span> Ready to teach & solve`;
      agentAvatar.innerHTML = `<i data-lucide="bot"></i>`;
    } else if (persona === 'math') {
      statusDesc.innerHTML = `<span class="pulse-indicator"></span> Math Wizard Active`;
      agentAvatar.innerHTML = `<i data-lucide="binary"></i>`;
    } else if (persona === 'code') {
      statusDesc.innerHTML = `<span class="pulse-indicator"></span> Code Specialist Active`;
      agentAvatar.innerHTML = `<i data-lucide="terminal"></i>`;
    } else if (persona === 'strategy') {
      statusDesc.innerHTML = `<span class="pulse-indicator"></span> Exam Strategist Active`;
      agentAvatar.innerHTML = `<i data-lucide="award"></i>`;
    }
    
    appendMessage('system', `🔄 *Persona changed to:* **${personaSelect.options[personaSelect.selectedIndex].text}**. I will now frame my explanations accordingly!`, true);
    lucide.createIcons();
  });
}

function insertMathHelper(wrapper) {
  const textarea = document.getElementById('chat-input');
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const before = text.substring(0, start);
  const after  = text.substring(end, text.length);
  
  textarea.value = before + wrapper + " " + wrapper + after;
  textarea.focus();
  textarea.selectionStart = start + wrapper.length + 1;
  textarea.selectionEnd = start + wrapper.length + 1;
}

function appendMessage(sender, text, isMarkdown = true) {
  const container = document.getElementById('chat-messages-container');
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${sender}-message`;
  
  const avatarHtml = sender === 'system' 
    ? `<div class="msg-avatar"><i data-lucide="bot"></i></div>`
    : `<div class="msg-avatar">GC</div>`;
  
  msgDiv.innerHTML = avatarHtml;
  
  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'msg-bubble';
  
  if (isMarkdown && sender === 'system') {
    bubbleDiv.innerHTML = marked.parse(text);
  } else {
    // Escape HTML for user input
    const textEscaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    bubbleDiv.innerHTML = `<p>${textEscaped.replace(/\n/g, '<br>')}</p>`;
  }
  
  msgDiv.appendChild(bubbleDiv);
  container.appendChild(msgDiv);
  
  // Render LaTeX math inside this bubble
  if (sender === 'system') {
    renderMathInElement(bubbleDiv, {
      delimiters: [
        {left: "$$", right: "$$", display: true},
        {left: "$", right: "$", display: false}
      ],
      throwOnError: false
    });
  }
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
  lucide.createIcons();
}

function handleUserSendMessage() {
  const chatInput = document.getElementById('chat-input');
  const userText = chatInput.value.trim();
  if (userText.length === 0) return;

  // Append user message
  appendMessage('user', userText, false);
  chatInput.value = "";
  
  // Append to state history
  state.chatHistory.push({ role: "user", parts: [{ text: userText }] });

  // Render temporary typing indicator
  const container = document.getElementById('chat-messages-container');
  const typingDiv = document.createElement('div');
  typingDiv.className = "message system-message typing-indicator-holder";
  typingDiv.innerHTML = `
    <div class="msg-avatar"><i data-lucide="bot"></i></div>
    <div class="msg-bubble">
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  container.appendChild(typingDiv);
  container.scrollTop = container.scrollHeight;
  lucide.createIcons();

  // Send request
  setTimeout(async () => {
    // Remove typing indicator
    const indicators = container.querySelectorAll('.typing-indicator-holder');
    indicators.forEach(i => i.remove());

    try {
      let replyText = "";
      if (state.apiKey) {
        // CALL GEMINI LIVE API
        replyText = await callGeminiAPI(userText);
      } else {
        // OFFLINE SIMULATION FALLBACK
        replyText = getOfflineFallbackResponse(userText);
      }

      state.aiQueriesCount++;
      state.chatHistory.push({ role: "model", parts: [{ text: replyText }] });
      saveState();

      // Append bot message
      appendMessage('system', replyText, true);
    } catch (err) {
      console.error(err);
      appendMessage('system', "❌ **API Error**: Unable to contact the Gemini service. Please verify your internet connection and API Key settings.", true);
    }
  }, 600);
}

function getOfflineFallbackResponse(userText) {
  const cleanText = userText.toLowerCase();
  
  // Check against our database keys
  if (cleanText.includes("normal") || cleanText.includes("3nf") || cleanText.includes("bcnf")) {
    return OFFLINE_EXPERT_RESPONSES["3nf"];
  }
  if (cleanText.includes("master") || cleanText.includes("recurrence")) {
    return OFFLINE_EXPERT_RESPONSES["masters"];
  }
  if (cleanText.includes("sliding") || cleanText.includes("efficiency") || cleanText.includes("flow control")) {
    return OFFLINE_EXPERT_RESPONSES["sliding"];
  }
  if (cleanText.includes("dijkstra") || cleanText.includes("shortest path")) {
    return OFFLINE_EXPERT_RESPONSES["dijkstra"];
  }
  if (cleanText.includes("quiz") || cleanText.includes("test")) {
    return `### Offline Operating Systems Quiz Let's test your OS scheduling knowledge. Try to solve this:

**Question:** An operating system uses Shortest Remaining Time First (SRTF) CPU scheduling. Three processes arrive at time $t=0, 1, 2$ with burst times $6, 4, 2$ respectively. What is the average waiting time of these processes?

*Think about it! If you want me to grade your answer, configure your live **Gemini API Key** in settings so I can evaluate custom responses on the fly.*`;
  }

  // General offline message
  return `### Offline Mode Active (No Gemini API Key)

I analyzed your query: *"${userText}"*. 

Because a **Gemini API Key** is not set up, I am serving you from my offline tutoring database. To unlock the full intelligence of a live AI tutor who can write code, prove theorems, solve arbitrary numerical questions, and provide immediate personalized tutoring, please follow these steps:

1. Click on **"Configure Gemini AI Key"** in the sidebar.
2. Follow the free link to **Google AI Studio** to retrieve a API Key.
3. Paste the key and save.

**Common Offline Topics available:**
- Try asking about: **"3NF and BCNF"**
- Try asking about: **"Master's Theorem"**
- Try asking about: **"Sliding Window Efficiency"**
- Try asking about: **"Dijkstra's Algorithm"**`;
}

async function callGeminiAPI(latestQuery) {
  const API_KEY = state.apiKey;
  // Endpoint for Gemini 1.5 Flash
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  
  // Choose system context based on selected persona
  const persona = document.getElementById('persona-select').value;
  let systemContext = `SYSTEM INSTRUCTION: You are 'GATE Guru', an expert AI tutor specializing in the Graduate Aptitude Test in Engineering (GATE) exam. Provide highly rigorous, step-by-step mathematical, logical, and code-based explanations. Use LaTeX ($...$ for inline and $$...$$ for blocks) for formulas. Format final answers clearly with bullet points. Always show complete derivations for numerical calculations. Keep code blocks neat with language labels. Respond using markdown.`;

  if (persona === 'math') {
    systemContext = `SYSTEM INSTRUCTION: You are 'GATE Guru - Math & Theorem Wizard', a specialist AI mathematician for the GATE exam. Focus intensely on step-by-step mathematical proofs, detailed algebraic derivations, matrices, probability, calculus, and discrete mathematics. Solve equations with extreme rigor using LaTeX notation. Walk through the reasoning step-by-step. Keep explanations clear and academically precise.`;
  } else if (persona === 'code') {
    systemContext = `SYSTEM INSTRUCTION: You are 'GATE Guru - Code & Compiler Specialist', an expert software engineer and CS compiler designer for the GATE exam. Focus on data structures, algorithmic complexity (Big O), pseudocode tracing, parsing tables (LL, LR), lexical analysis, and code optimizations. Use clean syntax highlighting for all code blocks, trace variables step-by-step, and explain memory allocations clearly.`;
  } else if (persona === 'strategy') {
    systemContext = `SYSTEM INSTRUCTION: You are 'GATE Guru - Exam Strategist', a high-ranking mentor who helps students score Under-100 ranks. Focus on study tips, subject weightage trends, time management during the 3-hour exam, negative marking avoidance strategies, and recommendations on how to distribute study focus. Provide clear actionable advice, motivational insights, and milestone templates.`;
  }

  // Construct request contents incorporating short history
  const historyForCall = [];
  
  // Keep last 4 messages to preserve context without blowing up tokens
  const slicedHistory = state.chatHistory.slice(-6);
  slicedHistory.forEach(msg => {
    historyForCall.push({
      role: msg.role,
      parts: [{ text: msg.parts[0].text }]
    });
  });

  // Inject system context to user prompt if history is empty, or keep it front-loaded
  if (historyForCall.length > 0) {
    historyForCall[0].parts[0].text = systemContext + "\n\nFirst question: " + historyForCall[0].parts[0].text;
  } else {
    historyForCall.push({
      role: "user",
      parts: [{ text: systemContext + "\n\nFirst question: " + latestQuery }]
    });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: historyForCall })
  });

  if (!response.ok) {
    const errorJson = await response.json();
    throw new Error(errorJson.error?.message || "HTTP error");
  }

  const json = await response.json();
  const text = json.candidates[0].content.parts[0].text;
  return text;
}

// ==========================================================================
// PRACTICE ARENA SIMULATOR
// ==========================================================================

let filteredQuestions = [];
let currentQuestionIndex = 0;
let questionTimerInterval = null;
let secondsSpentOnQuestion = 0;

function initPractice() {
  const subjectChips = document.querySelectorAll('.subject-chip');
  const prevBtn = document.getElementById('prev-question-btn');
  const nextBtn = document.getElementById('next-question-btn');
  const submitBtn = document.getElementById('submit-answer-btn');
  const resetBtn = document.getElementById('reset-practice-btn');
  const solveAiBtn = document.getElementById('solve-with-ai-btn');

  // Filter subject click
  subjectChips.forEach(chip => {
    chip.addEventListener('click', () => {
      subjectChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const subject = chip.getAttribute('data-subject');
      loadPracticeQuestions(subject);
    });
  });

  prevBtn.addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      displayQuestion();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentQuestionIndex < filteredQuestions.length - 1) {
      currentQuestionIndex++;
      displayQuestion();
    }
  });

  submitBtn.addEventListener('click', () => {
    gradeActiveQuestion();
  });

  resetBtn.addEventListener('click', () => {
    if (confirm("Reset all quiz and score progress on this device?")) {
      state.solvedQuestions = {};
      saveState();
      updateDashboardStats();
      const activeChip = document.querySelector('.subject-chip.active');
      loadPracticeQuestions(activeChip ? activeChip.getAttribute('data-subject') : 'all');
    }
  });

  solveAiBtn.addEventListener('click', () => {
    triggerSolveWithAI();
  });

  // Default load
  loadPracticeQuestions('all');
}

function loadPracticeQuestions(subjectFilter) {
  if (subjectFilter === 'all') {
    filteredQuestions = [...GATE_QUESTIONS];
  } else {
    filteredQuestions = GATE_QUESTIONS.filter(q => q.subject === subjectFilter);
  }

  currentQuestionIndex = 0;
  updatePracticeCounters();
  
  if (filteredQuestions.length > 0) {
    document.getElementById('active-question-card').classList.remove('hidden');
    displayQuestion();
  } else {
    // If no questions in filtered set
    const qCard = document.getElementById('active-question-card');
    qCard.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 3rem;">
        <i data-lucide="info" style="width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 1.5rem;"></i>
        <h3>No questions preloaded for this subject</h3>
        <p>You can ask GATE Guru AI directly in the chat to generate questions on this topic!</p>
      </div>
    `;
    lucide.createIcons();
  }
}

function updatePracticeCounters() {
  const solvedKeys = Object.keys(state.solvedQuestions);
  // Count correct and attempted within current filter
  let attempted = 0;
  let correct = 0;

  filteredQuestions.forEach(q => {
    if (state.solvedQuestions[q.id]) {
      attempted++;
      if (state.solvedQuestions[q.id].isCorrect) {
        correct++;
      }
    }
  });

  document.getElementById('practice-total-count').textContent = filteredQuestions.length;
  document.getElementById('practice-attempted-count').textContent = attempted;
  document.getElementById('practice-correct-count').textContent = correct;
}

function displayQuestion() {
  if (filteredQuestions.length === 0) return;
  
  const q = filteredQuestions[currentQuestionIndex];
  
  // Update header badges
  document.getElementById('q-subject').textContent = q.subject;
  document.getElementById('q-topic').textContent = q.topic;
  document.getElementById('q-type').textContent = q.type;

  // Render question text
  const qTextDiv = document.getElementById('q-text');
  qTextDiv.innerHTML = marked.parse(q.text);

  // Render options container
  const optionsDiv = document.getElementById('q-options-container');
  optionsDiv.innerHTML = "";

  const solvedData = state.solvedQuestions[q.id];

  if (q.type === 'MCQ') {
    q.options.forEach((optText, index) => {
      const optWrap = document.createElement('div');
      optWrap.className = 'option-wrapper';
      optWrap.dataset.index = index;
      
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `options-${q.id}`;
      radio.id = `opt-${q.id}-${index}`;
      radio.value = index;

      if (solvedData) {
        radio.disabled = true;
        if (solvedData.userAnswers === index) {
          radio.checked = true;
          optWrap.classList.add('selected');
        }
        
        // Highlight states
        if (index === q.correctAnswer) {
          optWrap.classList.add('correct');
        } else if (solvedData.userAnswers === index) {
          optWrap.classList.add('incorrect');
        }
      } else {
        optWrap.addEventListener('click', () => {
          document.querySelectorAll('.option-wrapper').forEach(w => w.classList.remove('selected'));
          radio.checked = true;
          optWrap.classList.add('selected');
        });
      }

      const label = document.createElement('label');
      label.htmlFor = `opt-${q.id}-${index}`;
      label.className = 'option-label-text';
      label.innerHTML = marked.parseInline(optText);

      optWrap.appendChild(radio);
      optWrap.appendChild(label);
      optionsDiv.appendChild(optWrap);
    });
  } else if (q.type === 'MSQ') {
    q.options.forEach((optText, index) => {
      const optWrap = document.createElement('div');
      optWrap.className = 'option-wrapper';
      optWrap.dataset.index = index;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = `options-${q.id}[]`;
      checkbox.id = `opt-${q.id}-${index}`;
      checkbox.value = index;

      if (solvedData) {
        checkbox.disabled = true;
        const isUserChecked = Array.isArray(solvedData.userAnswers) && solvedData.userAnswers.includes(index);
        const isCorrectOption = q.correctAnswer.includes(index);
        
        if (isUserChecked) {
          checkbox.checked = true;
          optWrap.classList.add('selected');
        }

        if (isCorrectOption) {
          optWrap.classList.add('correct');
        } else if (isUserChecked) {
          optWrap.classList.add('incorrect');
        }
      } else {
        optWrap.addEventListener('click', (e) => {
          if (e.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
          }
          if (checkbox.checked) {
            optWrap.classList.add('selected');
          } else {
            optWrap.classList.remove('selected');
          }
        });
      }

      const label = document.createElement('label');
      label.htmlFor = `opt-${q.id}-${index}`;
      label.className = 'option-label-text';
      label.innerHTML = marked.parseInline(optText);

      optWrap.appendChild(checkbox);
      optWrap.appendChild(label);
      optionsDiv.appendChild(optWrap);
    });
  } else if (q.type === 'NAT') {
    const natContainer = document.createElement('div');
    natContainer.className = 'nat-container';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'nat-input-box';
    input.placeholder = 'Enter numerical answer...';
    input.id = `nat-input-${q.id}`;

    if (solvedData) {
      input.disabled = true;
      input.value = solvedData.userAnswers;
      if (solvedData.isCorrect) {
        input.style.borderColor = 'var(--success)';
        input.style.boxShadow = '0 0 8px var(--success-glow)';
      } else {
        input.style.borderColor = 'var(--error)';
      }
    }

    const help = document.createElement('span');
    help.className = 'nat-help';
    help.textContent = solvedData ? `Correct Answer: ${q.correctAnswer}` : 'Enter an integer or decimal value (e.g. 4, 1.25)';

    natContainer.appendChild(input);
    natContainer.appendChild(help);
    optionsDiv.appendChild(natContainer);
  }

  // Setup navigation disable states
  document.getElementById('prev-question-btn').disabled = (currentQuestionIndex === 0);
  document.getElementById('next-question-btn').disabled = (currentQuestionIndex === filteredQuestions.length - 1);

  // Setup feedback drawer
  const feedbackBox = document.getElementById('q-feedback-box');
  const submitBtn = document.getElementById('submit-answer-btn');

  if (solvedData) {
    submitBtn.disabled = true;
    feedbackBox.classList.remove('hidden');
    
    // Set feedback banner content
    const banner = document.getElementById('q-feedback-banner');
    const msg = document.getElementById('feedback-message');
    const fIcon = document.getElementById('feedback-icon');
    
    feedbackBox.className = "question-feedback-box " + (solvedData.isCorrect ? "correct-feedback" : "incorrect-feedback");
    
    if (solvedData.isCorrect) {
      msg.textContent = "Correct Answer! Well done.";
      fIcon.setAttribute('data-lucide', 'check-circle');
    } else {
      msg.textContent = "Incorrect Answer. Analyze the solution details below.";
      fIcon.setAttribute('data-lucide', 'alert-circle');
    }

    // Set explanation text
    const expText = document.getElementById('q-explanation-text');
    expText.innerHTML = marked.parse(q.explanation);

    // Call MathJax/KaTeX auto-render on the card
    renderMathInElement(qTextDiv, { delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}], throwOnError: false });
    renderMathInElement(optionsDiv, { delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}], throwOnError: false });
    renderMathInElement(expText, { delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}], throwOnError: false });
  } else {
    submitBtn.disabled = false;
    feedbackBox.classList.add('hidden');
    
    // Render equations in active question
    renderMathInElement(qTextDiv, { delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}], throwOnError: false });
    renderMathInElement(optionsDiv, { delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}], throwOnError: false });
  }

  // Start/Reset question timer
  startQuestionTimer();
  lucide.createIcons();
}

function startQuestionTimer() {
  if (questionTimerInterval) {
    clearInterval(questionTimerInterval);
  }
  secondsSpentOnQuestion = 0;
  const timerSpan = document.getElementById('q-timer');
  timerSpan.textContent = "00:00";

  questionTimerInterval = setInterval(() => {
    secondsSpentOnQuestion++;
    const mins = Math.floor(secondsSpentOnQuestion / 60).toString().padStart(2, '0');
    const secs = (secondsSpentOnQuestion % 60).toString().padStart(2, '0');
    timerSpan.textContent = `${mins}:${secs}`;
  }, 1000);
}

function gradeActiveQuestion() {
  if (filteredQuestions.length === 0) return;
  const q = filteredQuestions[currentQuestionIndex];
  
  let userAnswers = null;
  let isCorrect = false;

  if (q.type === 'MCQ') {
    const selectedRadio = document.querySelector(`input[name="options-${q.id}"]:checked`);
    if (!selectedRadio) {
      alert("Please select an option before submitting!");
      return;
    }
    userAnswers = parseInt(selectedRadio.value);
    isCorrect = (userAnswers === q.correctAnswer);
  } else if (q.type === 'MSQ') {
    const checkedBoxes = document.querySelectorAll(`input[name="options-${q.id}[]"]:checked`);
    if (checkedBoxes.length === 0) {
      alert("Please select at least one option!");
      return;
    }
    
    userAnswers = Array.from(checkedBoxes).map(b => parseInt(b.value));
    
    // Check match exactly
    const correctArr = q.correctAnswer;
    if (userAnswers.length === correctArr.length) {
      isCorrect = userAnswers.every(val => correctArr.includes(val));
    } else {
      isCorrect = false;
    }
  } else if (q.type === 'NAT') {
    const input = document.getElementById(`nat-input-${q.id}`);
    const userVal = parseFloat(input.value.trim());
    if (isNaN(userVal)) {
      alert("Please enter a valid numerical value!");
      return;
    }

    userAnswers = userVal;
    
    // Check tolerance (0.01 margin)
    const margin = 0.01;
    isCorrect = Math.abs(userVal - q.correctAnswer) <= margin;
  }

  // Clear timer
  clearInterval(questionTimerInterval);

  // Save to State
  state.solvedQuestions[q.id] = {
    attempted: true,
    isCorrect: isCorrect,
    userAnswers: userAnswers
  };

  saveState();
  updatePracticeCounters();
  updateDashboardStats();

  // Reload current display to show correct/incorrect borders & explanations
  displayQuestion();
}

function triggerSolveWithAI() {
  if (filteredQuestions.length === 0) return;
  const q = filteredQuestions[currentQuestionIndex];

  // Construct prompt
  let optionsBlock = "";
  if (q.options && q.options.length > 0) {
    optionsBlock = "\nOptions:\n" + q.options.map((o, idx) => `${String.fromCharCode(65 + idx)}. ${o}`).join("\n");
  }

  const prompt = `Please solve this GATE exam question step-by-step:\n\nSubject: ${q.subject}\nTopic: ${q.topic}\nType: ${q.type}\n\nQuestion:\n${q.text}\n${optionsBlock}\n\nProvide the correct choice/value and show complete mathematical steps.`;

  // Go to Chat tab
  switchTab('chat');
  
  // Fill input and submit
  const chatInput = document.getElementById('chat-input');
  chatInput.value = prompt;
  handleUserSendMessage();
}

// ==========================================================================
// FORMULA HUB: Handbook and Quick-Reference
// ==========================================================================

function renderFormulas() {
  const container = document.getElementById('formulas-container');
  container.innerHTML = "";
  
  GATE_FORMULAS.forEach(f => {
    const card = document.createElement('div');
    card.className = 'glass-card formula-card';
    card.dataset.id = f.id;
    
    card.innerHTML = `
      <div class="formula-card-header">
        <div class="formula-card-title">
          <h3>${f.name}</h3>
          <p>${f.subject} • ${f.topic}</p>
        </div>
        <span class="badge badge-outline">${f.topic}</span>
      </div>
      
      <div class="formula-expression-box" id="eq-${f.id}">
        $$${f.formula}$$
      </div>
      
      <p class="formula-desc">${f.description}</p>
      
      <div class="formula-card-footer">
        <button class="btn btn-sm btn-secondary" onclick="askAiAboutFormula('${f.id}')">
          <i data-lucide="message-square" style="width: 14px; height: 14px;"></i> Ask GATE Guru
        </button>
      </div>
    `;
    
    container.appendChild(card);
    
    // Render math inside expression
    const box = document.getElementById(`eq-${f.id}`);
    renderMathInElement(box, { delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}], throwOnError: false });
  });

  // Setup search filter listening
  const search = document.getElementById('formula-search');
  search.addEventListener('input', (e) => {
    filterFormulas(e.target.value.trim());
  });

  lucide.createIcons();
}

function filterFormulas(query) {
  const cleanQuery = query.toLowerCase();
  const cards = document.querySelectorAll('.formula-card');
  
  cards.forEach(card => {
    const fId = card.dataset.id;
    const formulaObj = GATE_FORMULAS.find(item => item.id === fId);
    if (!formulaObj) return;

    const matches = 
      formulaObj.name.toLowerCase().includes(cleanQuery) ||
      formulaObj.subject.toLowerCase().includes(cleanQuery) ||
      formulaObj.topic.toLowerCase().includes(cleanQuery) ||
      formulaObj.description.toLowerCase().includes(cleanQuery);

    if (matches) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
}

function askAiAboutFormula(formulaId) {
  const f = GATE_FORMULAS.find(item => item.id === formulaId);
  if (!f) return;

  const prompt = `Please explain the usage, derivation, and standard GATE exam problems related to this formula:\n\nName: ${f.name}\nSubject: ${f.subject}\nTopic: ${f.topic}\nFormula: \$\$ ${f.formula} \$\$\n\nGive 1 practical GATE example problem and solve it.`;

  // Go to Chat tab
  switchTab('chat');
  
  // Fill input and submit
  const chatInput = document.getElementById('chat-input');
  chatInput.value = prompt;
  handleUserSendMessage();
}

// ==========================================================================
// STUDY PLANNER: Custom Schedules
// ==========================================================================

const SUBJECTS_WEIGHT_BY_BRANCH = {
  CS: [
    { name: "Engineering Mathematics & Discrete Math", weight: 15 },
    { name: "General Aptitude", weight: 15 },
    { name: "Algorithms & Data Structures", weight: 15 },
    { name: "Operating Systems", weight: 10 },
    { name: "Database Management Systems", weight: 8 },
    { name: "Computer Networks", weight: 9 },
    { name: "Theory of Computation", weight: 9 },
    { name: "Digital Logic & Computer Organization", weight: 11 },
    { name: "Compiler Design", weight: 8 }
  ],
  EC: [
    { name: "Engineering Mathematics", weight: 15 },
    { name: "General Aptitude", weight: 15 },
    { name: "Network Theory", weight: 10 },
    { name: "Signals and Systems", weight: 10 },
    { name: "Electronic Devices", weight: 10 },
    { name: "Analog Circuits", weight: 12 },
    { name: "Digital Circuits", weight: 10 },
    { name: "Control Systems", weight: 8 },
    { name: "Electromagnetics", weight: 10 }
  ],
  EE: [
    { name: "Engineering Mathematics", weight: 15 },
    { name: "General Aptitude", weight: 15 },
    { name: "Electric Circuits", weight: 10 },
    { name: "Electromagnetic Fields", weight: 6 },
    { name: "Signals and Systems", weight: 8 },
    { name: "Electrical Machines", weight: 13 },
    { name: "Power Systems", weight: 11 },
    { name: "Control Systems", weight: 9 },
    { name: "Electrical and Electronic Measurements", weight: 5 },
    { name: "Analog and Digital Electronics", weight: 8 }
  ],
  ME: [
    { name: "Engineering Mathematics", weight: 15 },
    { name: "General Aptitude", weight: 15 },
    { name: "Applied Mechanics & Design", weight: 28 },
    { name: "Fluid Mechanics & Thermal Sciences", weight: 27 },
    { name: "Materials, Manufacturing & Industrial Eng", weight: 15 }
  ],
  CE: [
    { name: "Engineering Mathematics", weight: 15 },
    { name: "General Aptitude", weight: 15 },
    { name: "Structural Engineering", weight: 22 },
    { name: "Geotechnical Engineering", weight: 15 },
    { name: "Water Resources Engineering", weight: 12 },
    { name: "Environmental Engineering", weight: 11 },
    { name: "Transportation & Geomatics Eng", weight: 10 }
  ]
};

function initPlanner() {
  const hoursSlider = document.getElementById('plan-hours');
  const hoursVal = document.getElementById('plan-hours-val');
  
  hoursSlider.addEventListener('input', (e) => {
    hoursVal.textContent = `${e.target.value} Hours`;
  });

  // If plan exists in storage, generate it automatically on load
  if (state.planner) {
    document.getElementById('plan-branch').value = state.planner.branch;
    document.getElementById('plan-date').value = state.planner.date;
    document.getElementById('plan-hours').value = state.planner.dailyHours;
    document.getElementById('plan-hours-val').textContent = `${state.planner.dailyHours} Hours`;
    
    // Set level radio
    const radios = document.getElementsByName('plan-level');
    for (let r of radios) {
      if (r.value === state.planner.level) {
        r.checked = true;
      }
    }

    generateStudyPlan();
  }
}

function generateStudyPlan() {
  const branch = document.getElementById('plan-branch').value;
  const dateInput = document.getElementById('plan-date').value;
  const dailyHours = parseInt(document.getElementById('plan-hours').value);
  const level = document.querySelector('input[name="plan-level"]:checked').value;

  const targetDate = new Date(dateInput);
  const today = new Date();
  
  // Calculate difference in days
  const diffTime = targetDate - today;
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (totalDays <= 0) {
    alert("Please select a future target date for the GATE exam!");
    return;
  }

  // Calculate stats
  const totalHours = totalDays * dailyHours;
  const mocksRecommended = Math.max(5, Math.floor(totalDays / 12));

  // Save to State
  state.planner = {
    branch: branch,
    date: dateInput,
    dailyHours: dailyHours,
    level: level,
    totalDays: totalDays,
    totalHours: totalHours
  };
  saveState();

  // Hide empty state and show results viewport
  document.getElementById('planner-empty-state').classList.add('hidden');
  document.getElementById('planner-results').classList.remove('hidden');

  // Fill Summary Panel
  document.getElementById('summary-total-days').textContent = totalDays;
  document.getElementById('summary-total-hours').textContent = totalHours;
  document.getElementById('summary-mocks').textContent = mocksRecommended;
  document.getElementById('summary-daily-target').textContent = `${dailyHours} hrs`;

  // Draw subject weight bars
  const weightsContainer = document.getElementById('planner-weights-container');
  weightsContainer.innerHTML = "";
  
  const subjects = SUBJECTS_WEIGHT_BY_BRANCH[branch] || SUBJECTS_WEIGHT_BY_BRANCH["CS"];
  
  subjects.forEach(sub => {
    const row = document.createElement('div');
    row.className = 'weight-row';
    row.innerHTML = `
      <div class="weight-row-meta">
        <span class="sub-title">${sub.name}</span>
        <span class="sub-pct">${sub.weight}% (Priority)</span>
      </div>
      <div class="progress-track">
        <div class="progress-bar-fill" style="width: ${sub.weight}%"></div>
      </div>
    `;
    weightsContainer.appendChild(row);
  });

  // Generate week-by-week timeline roadmap
  const roadmapContainer = document.getElementById('planner-roadmap-container');
  roadmapContainer.innerHTML = "";

  const totalWeeks = Math.ceil(totalDays / 7);
  
  // Divide weeks proportionally to subject weights and difficulty
  // Define phase breakdowns
  let phase1Weeks = Math.round(totalWeeks * 0.5); // Core syllabus covering
  let phase2Weeks = Math.round(totalWeeks * 0.3); // Revision & Subject-wise tests
  let phase3Weeks = totalWeeks - phase1Weeks - phase2Weeks; // Full Mock tests & speed tuning

  if (level === 'intermediate') {
    phase1Weeks = Math.round(totalWeeks * 0.4);
    phase2Weeks = Math.round(totalWeeks * 0.4);
    phase3Weeks = totalWeeks - phase1Weeks - phase2Weeks;
  } else if (level === 'advanced') {
    phase1Weeks = Math.round(totalWeeks * 0.2);
    phase2Weeks = Math.round(totalWeeks * 0.4);
    phase3Weeks = totalWeeks - phase1Weeks - phase2Weeks;
  }

  // Construct phase descriptions
  const roadmapData = [];
  
  // Phase 1 Nodes
  let startWeek = 1;
  let endWeek = phase1Weeks;
  roadmapData.push({
    title: `Phase 1: Syllabus Coverage (${startWeek === endWeek ? `Week ${startWeek}` : `Weeks ${startWeek}-${endWeek}`})`,
    dates: `${Math.round(phase1Weeks * 7)} Days Dedicated`,
    desc: `Focus on core high-weightage subjects. Master derivations and solve subject-specific previous year questions (PYQs). Recommended checklist:
      <ul>
        <li>Begin with <strong>Engineering Math & Aptitude</strong> (daily 1 hour).</li>
        <li>Sub-divide remaining weeks amongst core technical units (e.g. Algorithms, OS, DBMS for CS).</li>
        <li>Maintain a clean formulas diary.</li>
      </ul>`
  });

  // Phase 2 Nodes
  startWeek = endWeek + 1;
  endWeek = startWeek + phase2Weeks - 1;
  roadmapData.push({
    title: `Phase 2: Subject Revision & Sectional Mock Tests (${startWeek === endWeek ? `Week ${startWeek}` : `Weeks ${startWeek}-${endWeek}`})`,
    dates: `${Math.round(phase2Weeks * 7)} Days Dedicated`,
    desc: `Shift focus from fresh topics to consolidating what is learnt. Complete topic-wise quiz sessions. Checklist:
      <ul>
        <li>Solve at least 50 mock questions per week in the Practice Arena.</li>
        <li>Review incorrect attempts in detail. Ask **GATE Guru** to explain patterns you fail.</li>
        <li>Begin writing sectional subject tests. Aim for >70% accuracy.</li>
      </ul>`
  });

  // Phase 3 Nodes
  startWeek = endWeek + 1;
  endWeek = totalWeeks;
  roadmapData.push({
    title: `Phase 3: Full Length Mock Tests & Speed Tuning (${startWeek === endWeek ? `Week ${startWeek}` : `Weeks ${startWeek}-${endWeek}`})`,
    dates: `${Math.round(phase3Weeks * 7)} Days Dedicated`,
    desc: `Simulate the actual 3-hour GATE exam condition. Focus on time management and minimizing negative marks. Checklist:
      <ul>
        <li>Write 2 Full Length Mock Tests per week.</li>
        <li>Dedicate 3 hours for test and 4 hours for review.</li>
        <li>Use the **Formula Hub** for daily fast recalls before sleeping.</li>
        <li>Minimize silly mistakes on Numerical Answer Type (NAT) questions.</li>
      </ul>`
  });

  // Render roadmap
  roadmapData.forEach(node => {
    const div = document.createElement('div');
    div.className = 'timeline-node';
    div.innerHTML = `
      <div class="node-header">
        <span class="week-title">${node.title}</span>
        <span class="week-dates">• ${node.dates}</span>
      </div>
      <div class="node-content">
        <p>${node.desc}</p>
      </div>
    `;
    roadmapContainer.appendChild(div);
  });

  // Update dashboard values in view
  updateDashboardStats();
  lucide.createIcons();
}

// Check search query from dashboard
function checkSearchQuery() {
  const urlParams = new URLSearchParams(window.location.search);
  const q = urlParams.get('q');
  if (q) {
    switchTab('formulas');
    document.getElementById('formula-search').value = q;
    filterFormulas(q);
  }
}
