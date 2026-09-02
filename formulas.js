const GATE_FORMULAS = [
  {
    id: "f-math-01",
    subject: "Engineering Mathematics",
    topic: "Linear Algebra",
    name: "Eigenvalues and Trace / Determinant",
    formula: "\\sum_{i=1}^{n} \\lambda_i = \\text{Trace}(A) \\quad \\text{and} \\quad \\prod_{i=1}^{n} \\lambda_i = \\det(A)",
    description: "The sum of the eigenvalues of a matrix $A$ equals its trace (sum of diagonal elements), and the product of the eigenvalues equals its determinant."
  },
  {
    id: "f-math-02",
    subject: "Engineering Mathematics",
    topic: "Probability",
    name: "Bayes' Theorem",
    formula: "P(A \\mid B) = \\frac{P(B \\mid A) \\cdot P(A)}{P(B)} = \\frac{P(B \\mid A) \\cdot P(A)}{P(B \\mid A)P(A) + P(B \\mid A^c)P(A^c)}",
    description: "Relates conditional and marginal probabilities of random events. Crucial for network routing and machine learning problems in GATE."
  },
  {
    id: "f-algo-01",
    subject: "Algorithms & Data Structures",
    topic: "Recurrence Relations",
    name: "Master's Theorem",
    formula: "T(n) = aT(n/b) + f(n) \\implies T(n) = \\begin{cases} \\Theta(n^{\\log_b a}) & \\text{if } f(n) = O(n^{\\log_b a - \\epsilon}) \\\\ \\Theta(n^{\\log_b a} \\log^k n) & \\text{if } f(n) = \\Theta(n^{\\log_b a} \\log^k n) \\\\ \\Theta(f(n)) & \\text{if } f(n) = \\Omega(n^{\\log_b a + \\epsilon}) \\end{cases}",
    description: "A cookbook recipe for solving divide-and-conquer recurrence relations where $a \\ge 1$ and $b > 1$."
  },
  {
    id: "f-algo-02",
    subject: "Algorithms & Data Structures",
    topic: "Graph Theory",
    name: "Sum of Degrees (Handshaking Lemma)",
    formula: "\\sum_{v \\in V} \\deg(v) = 2|E|",
    description: "In any graph, the sum of degrees of all vertices is twice the number of edges. This implies that the number of vertices of odd degree is always even."
  },
  {
    id: "f-os-01",
    subject: "Operating Systems",
    topic: "Virtual Memory",
    name: "Effective Access Time (EAT)",
    formula: "\\text{EAT} = (1 - p) \\cdot t_m + p \\cdot t_p",
    description: "EAT is the average memory access time where $p$ is the page fault rate, $t_m$ is the main memory access time, and $t_p$ is the page fault service time."
  },
  {
    id: "f-os-02",
    subject: "Operating Systems",
    topic: "Disk Scheduling",
    name: "Disk Access Time",
    formula: "\\text{Disk Access Time} = \\text{Seek Time} + \\text{Rotational Latency} + \\text{Transfer Time} + \\text{Controller Overhead}",
    description: "Average rotational latency is equal to $\\frac{1}{2R}$ where $R$ is the rotational speed in revolutions per second."
  },
  {
    id: "f-dbms-01",
    subject: "Database Systems",
    topic: "Relational Algebra",
    name: "Selectivity of Join",
    formula: "\\text{Size of } R \\bowtie_{R.A = S.A} S \\le |R| \\times |S|",
    description: "If $R.A$ is a primary key in $R$ and a foreign key in $S$, then $|R \\bowtie S| = |S|$."
  },
  {
    id: "f-cn-01",
    subject: "Computer Networks",
    topic: "Flow Control",
    name: "Sliding Window Efficiency",
    formula: "\\eta = \\frac{N \\cdot T_f}{T_f + 2T_p} = \\frac{N}{1 + 2a} \\quad \\text{where } a = \\frac{T_p}{T_f}",
    description: "Efficiency of a sliding window protocol with window size $N$, transmission delay $T_f$, and propagation delay $T_p$. For Stop-and-Wait, $N = 1$."
  },
  {
    id: "f-cn-02",
    subject: "Computer Networks",
    topic: "Routing Protocols",
    name: "IPv4 Header Minimum Size",
    formula: "\\text{Header Length} = IHL \\times 4 \\text{ bytes}",
    description: "The Internet Header Length (IHL) field is 4 bits wide. Its minimum value is 5, corresponding to $5 \\times 4 = 20$ bytes. Its maximum is 15, corresponding to 60 bytes."
  },
  {
    id: "f-digital-01",
    subject: "Digital Logic & COA",
    topic: "Boolean Algebra",
    name: "De Morgan's Laws",
    formula: "\\overline{X \\cdot Y} = \\overline{X} + \\overline{Y} \\quad \\text{and} \\quad \\overline{X + Y} = \\overline{X} \\cdot \\overline{Y}",
    description: "Fundamental laws of Boolean algebra to simplify logical expressions by distributing negation."
  },
  {
    id: "f-digital-02",
    subject: "Digital Logic & COA",
    topic: "Cache Memory",
    name: "Average Memory Access Time (AMAT)",
    formula: "\\text{AMAT} = T_{L1} + M_{L1} \\cdot (T_{L2} + M_{L2} \\cdot T_{\\text{main}})",
    description: "Calculates memory access time in a multi-level cache system, where $T_i$ is hit time at level $i$ and $M_i$ is miss rate at level $i$."
  }
];
