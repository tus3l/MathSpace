export type View =
  | "home"
  | "workspace"
  | "proof"
  | "geometry"
  | "trigonometry"
  | "calculus"
  | "linear"
  | "statistics"
  | "probability"
  | "sequences"
  | "transforms"
  | "complex"
  | "numbers"
  | "combinatorics"
  | "three"
  | "library"
  | "practice"
  | "advisor";
export type Topic = {
  id: string;
  title: string;
  english: string;
  category: string;
  formula: string;
  summary: string;
  detail: string;
  when: string;
  why: string;
  example: string;
  mistakes: string;
  related: string[];
  view: View;
};
export const topics: Topic[] = [
  {
    id: "quadratic",
    title: "المعادلة التربيعية",
    english: "Quadratic equation",
    category: "الجبر",
    formula: "x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}",
    summary: "معادلة أعلى قوة للمتغير فيها هي 2.",
    detail:
      "نكتبها ax² + bx + c = 0 مع a ≠ 0. المميز D = b² - 4ac يحدد عدد الجذور الحقيقية.",
    when: "عند حل معادلة من الدرجة الثانية، خصوصًا عندما يصعب التحليل.",
    why: "ينتج القانون العام من إكمال المربع على الصورة القياسية ثم أخذ الجذر للطرفين.",
    example: "x² + 5x + 6 = 0 ⟹ x = -2 أو x = -3",
    mistakes: "نسيان ±، أو قسمة جزء من البسط فقط على 2a.",
    related: ["functions", "square", "balance"],
    view: "workspace",
  },
  {
    id: "functions",
    title: "الدوال والتحويلات",
    english: "Functions transformations",
    category: "الدوال",
    formula: "y=a(x-h)^2+k",
    summary: "الدالة تربط كل مدخل بمخرج واحد.",
    detail:
      "a يتحكم في الاتجاه والتمدد الرأسي، h في الإزاحة الأفقية، وk في الإزاحة الرأسية. المجال يعتمد على التعبير الأصلي.",
    when: "لمقارنة المنحنيات وفهم تأثير تغيير المعاملات.",
    why: "استبدال x بـ x-h يجعل القيمة القديمة عند x تظهر عند x+h؛ إضافة k تغيّر المخرج فقط.",
    example: "y = (x-2)² + 3: إزاحة وحدتين يمينًا وثلاث وحدات للأعلى.",
    mistakes: "تفسير x-2 على أنه إزاحة إلى اليسار.",
    related: ["quadratic", "derivative"],
    view: "workspace",
  },
  {
    id: "square",
    title: "مربع مجموع عددين",
    english: "Binomial square visual proof",
    category: "الإثباتات",
    formula: "(a+b)^2=a^2+2ab+b^2",
    summary: "مساحة مربع طول ضلعه a+b هي مجموع أربع مناطق.",
    detail: "نقسم المربع إلى مربع a² ومربع b² ومستطيلين مساحة كل منهما ab.",
    when: "لفك مربع مجموع أو فهم إكمال المربع.",
    why: "المناطق لا تتداخل وتغطي المربع كاملًا، لذا تتساوى المساحة الكلية مع مجموع مساحاتها.",
    example: "(3+2)² = 9 + 6 + 6 + 4 = 25",
    mistakes: "كتابة (a+b)² = a² + b² ونسيان المستطيلين.",
    related: ["quadratic", "triangle"],
    view: "proof",
  },
  {
    id: "difference",
    title: "فرق بين مربعين",
    english: "Difference of squares factoring",
    category: "الجبر",
    formula: "a^2-b^2=(a-b)(a+b)",
    summary: "فرق المربعين يتحول إلى حاصل ضرب مجموع وفرق.",
    detail: "عند ضرب (a-b)(a+b)، يُلغى الحدان ab و-ab.",
    when: "عندما يكون لدينا حدان مربعان بينهما طرح.",
    why: "خاصية التوزيع: a² + ab - ab - b² = a² - b².",
    example: "x² - 4 = (x-2)(x+2)",
    mistakes: "استخدام القانون مع مجموع مربعين في الأعداد الحقيقية.",
    related: ["quadratic", "square"],
    view: "advisor",
  },
  {
    id: "balance",
    title: "توازن المعادلة",
    english: "Equation balance",
    category: "الجبر",
    formula: "a=b\\Rightarrow a-c=b-c",
    summary: "إجراء العملية نفسها على الطرفين يحفظ المساواة.",
    detail:
      "يمكن الجمع والطرح والضرب على الطرفين. القسمة جائزة على عدد غير صفري فقط.",
    when: "لعزل المتغير وحل المعادلات الخطية.",
    why: "طرفا المعادلة يمثلان قيمتين متساويتين؛ تغييرهما بالمقدار نفسه يبقيهما متساويين.",
    example: "x + 3 = 7 ⟹ x + 3 - 3 = 7 - 3 ⟹ x = 4",
    mistakes: "طرح الحد من طرف واحد فقط أو القسمة على الصفر.",
    related: ["quadratic"],
    view: "advisor",
  },
  {
    id: "circle",
    title: "مساحة الدائرة ومحيطها",
    english: "Circle area circumference",
    category: "الهندسة",
    formula: "A=\\pi r^2,\\quad C=2\\pi r",
    summary: "المساحة تتناسب مع مربع نصف القطر، والمحيط معه خطيًا.",
    detail: "إذا تضاعف نصف القطر، تتضاعف المساحة أربع مرات والمحيط مرتين.",
    when: "لقياس مساحة دائرة أو طول حدودها.",
    why: "يمكن إعادة ترتيب قطاعات صغيرة من الدائرة لتقارب مستطيلًا أبعاده πr وr.",
    example: "r = 3 ⟹ A = 9π، C = 6π",
    mistakes: "استخدام القطر بدل نصف القطر في πr².",
    related: ["triangle", "unit-circle"],
    view: "geometry",
  },
  {
    id: "triangle",
    title: "مساحة المثلث",
    english: "Triangle area",
    category: "الهندسة",
    formula: "A=\\frac{1}{2}bh",
    summary: "مساحة المثلث تساوي نصف حاصل ضرب القاعدة والارتفاع.",
    detail: "الارتفاع هو المسافة العمودية من الرأس إلى الخط الذي يحمل القاعدة.",
    when: "عند معرفة قاعدة المثلث والارتفاع المقابل.",
    why: "نسختان متطابقتان من المثلث تكونان متوازي أضلاع مساحته bh.",
    example: "b = 6، h = 4 ⟹ A = 12",
    mistakes: "استخدام ضلع مائل بدل الارتفاع العمودي.",
    related: ["pythagoras", "circle"],
    view: "geometry",
  },
  {
    id: "pythagoras",
    title: "نظرية فيثاغورس",
    english: "Pythagorean theorem",
    category: "الهندسة",
    formula: "a^2+b^2=c^2",
    summary: "في مثلث قائم، مربع الوتر يساوي مجموع مربعي الضلعين القائمين.",
    detail:
      "c هو الوتر المقابل للزاوية القائمة. لا ينطبق هذا القانون مباشرة على مثلث غير قائم.",
    when: "لحساب ضلع مجهول أو المسافة بين نقطتين.",
    why: "يمكن إعادة ترتيب أربع نسخ من المثلث داخل مربع لإظهار تساوي المساحتين.",
    example: "3² + 4² = 5²",
    mistakes: "اختيار ضلع غير الوتر ليكون c.",
    related: ["triangle", "vectors"],
    view: "geometry",
  },
  {
    id: "unit-circle",
    title: "دائرة الوحدة",
    english: "Unit circle sin cos tan",
    category: "المثلثات",
    formula: "(x,y)=(\\cos\\theta,\\sin\\theta)",
    summary: "نقطة الدائرة تربط الزاوية بقيم جيبها وجيب تمامها.",
    detail:
      "نصف القطر 1. الإحداثي الأفقي cos θ والرأسي sin θ، وtan θ = sin θ / cos θ إذا كان المقام غير صفري.",
    when: "لفهم الدوال المثلثية والإشارات والدورية.",
    why: "تعريف جيب وجيب تمام الزاوية يعتمد على نسب أضلاع المثلث القائم؛ الوتر هنا يساوي 1.",
    example: "θ = π/6 ⟹ sin θ = 1/2، cos θ = √3/2",
    mistakes: "خلط الدرجات بالراديان أو تجاهل نقاط عدم تعريف tan.",
    related: ["euler", "functions"],
    view: "trigonometry",
  },
  {
    id: "derivative",
    title: "المشتقة والمماس",
    english: "Derivative slope tangent rate velocity acceleration optimization",
    category: "التفاضل والتكامل",
    formula: "f'(x)=\\lim_{h\\to0}\\frac{f(x+h)-f(x)}{h}",
    summary: "المشتقة تصف معدل التغير اللحظي.",
    detail:
      "ميل القاطع يقيس تغيرًا على فترة، ومع اقتراب النقطتين يقترب من ميل المماس عند قابلية الاشتقاق.",
    when: "لحساب الميل والسرعة وتحليل القيم العظمى والصغرى.",
    why: "النسبة Δy/Δx تقيس تغير المخرج لكل وحدة من المدخل؛ الحد يجعل القياس محليًا.",
    example: "f(x)=x² ⟹ f′(x)=2x",
    mistakes: "افتراض أن كل دالة متصلة قابلة للاشتقاق.",
    related: ["limits", "integral", "functions"],
    view: "calculus",
  },
  {
    id: "limits",
    title: "النهايات",
    english: "Limits continuity",
    category: "التفاضل والتكامل",
    formula: "\\lim_{x\\to a}f(x)=L",
    summary: "النهاية تصف ما تقترب منه الدالة، لا بالضرورة قيمتها عند النقطة.",
    detail: "توجد النهاية الثنائية إذا تساوت النهايتان اليمنى واليسرى.",
    when: "لدراسة الاستمرارية والاشتقاق والقيم قرب نقاط غير معرفة.",
    why: "يمكن لقيم الدالة أن تقترب من L حتى لو كانت قيمة الدالة عند a مختلفة أو غير معرفة.",
    example: "lim x→2 (x²) = 4",
    mistakes: "الاعتماد على التعويض فقط عند وجود 0/0.",
    related: ["derivative", "integral"],
    view: "calculus",
  },
  {
    id: "integral",
    title: "التكامل ومجاميع ريمان",
    english: "Integral Riemann area",
    category: "التفاضل والتكامل",
    formula:
      "\\int_a^b f(x)\\,dx=\\lim_{n\\to\\infty}\\sum_{k=1}^n f(x_k)\\Delta x",
    summary: "التكامل المحدد يقيس التراكم والمساحة الموقّعة.",
    detail:
      "نقسم الفترة إلى مستطيلات؛ زيادة عددها تحسن التقريب للدوال المتصلة.",
    when: "لحساب تراكم كمية أو مساحة موقعة تحت منحنى.",
    why: "المستطيلات تجمع قيم الدالة على أجزاء صغيرة، ويصبح التقريب دقيقًا في الحد.",
    example: "∫₀² x² dx = 8/3",
    mistakes: "الخلط بين المساحة الهندسية والتكامل الموقّع.",
    related: ["derivative", "limits"],
    view: "calculus",
  },
  {
    id: "vectors",
    title: "المتجهات",
    english: "Vectors magnitude dot product",
    category: "الجبر الخطي",
    formula: "\\|v\\|=\\sqrt{v_x^2+v_y^2}",
    summary: "المتجه كمية ذات مقدار واتجاه.",
    detail: "نجمع المتجهات مركبة بمركبة. الضرب النقطي يرتبط بزاوية المتجهين.",
    when: "لتمثيل الإزاحة والسرعة والقوى.",
    why: "المركبات تمثل إزاحات مستقلة على المحاور؛ المقدار يتبع فيثاغورس.",
    example: "v=(3,4) ⟹ ‖v‖=5",
    mistakes: "اعتبار الضرب النقطي متجهًا بدل عدد.",
    related: ["matrix", "pythagoras"],
    view: "linear",
  },
  {
    id: "matrix",
    title: "التحويلات المصفوفية",
    english: "Matrix rotation shear determinant eigenvalues",
    category: "الجبر الخطي",
    formula:
      "\\begin{pmatrix}x'\\\\y'\\end{pmatrix}=A\\begin{pmatrix}x\\\\y\\end{pmatrix}",
    summary: "المصفوفة تحوّل المتجهات والشبكة معًا.",
    detail:
      "أعمدة المصفوفة هي صور متجهي الوحدة. المحدد يقيس عامل تغير المساحة مع الإشارة.",
    when: "للدوران والتمدد والقص وحل الأنظمة الخطية.",
    why: "أي متجه هو تركيب خطي من متجهي الوحدة، والتحويل الخطي يحفظ هذا التركيب.",
    example: "A=[[0,-1],[1,0]] يدور المستوى 90°.",
    mistakes: "تبديل ترتيب ضرب المصفوفات دون مبرر.",
    related: ["vectors", "systems"],
    view: "linear",
  },
  {
    id: "systems",
    title: "أنظمة المعادلات",
    english: "Systems substitution elimination intersection",
    category: "الجبر",
    formula: "A\\mathbf{x}=\\mathbf{b}",
    summary: "الحل يحقق جميع المعادلات في الوقت نفسه.",
    detail:
      "يمكن استخدام التعويض أو الحذف أو المصفوفات؛ بصريًا يظهر الحل كنقطة تقاطع.",
    when: "عند وجود أكثر من معادلة تشترك في متغيرات.",
    why: "النقطة على كل خط تحقق معادلته، فالنقطة المشتركة تحقق المعادلتين.",
    example: "y=2x+1، y=-x+4 ⟹ (x,y)=(1,3)",
    mistakes: "اعتبار الخطين المتوازيين ذوي تقاطع وحيد.",
    related: ["matrix", "balance"],
    view: "linear",
  },
  {
    id: "statistics",
    title: "المتوسط والتشتت",
    english:
      "Statistics mean median mode variance standard deviation regression",
    category: "الإحصاء",
    formula:
      "\\mu=\\frac{\\sum x_i}{n},\\quad\\sigma^2=\\frac{\\sum(x_i-\\mu)^2}{n}",
    summary: "المتوسط يصف المركز والتباين يصف انتشار القيم.",
    detail:
      "التباين المعروض تباين مجتمع: نقسم على n. تباين العينة غير المتحيز يقسم على n-1.",
    when: "لتلخيص البيانات ومقارنة توزيعها.",
    why: "تربيع الفروق يمنع إلغاء الفروق الموجبة والسالبة ويزيد تأثير القيم البعيدة.",
    example: "2، 4، 6 ⟹ المتوسط 4 والتباين 8/3.",
    mistakes: "خلط تباين المجتمع بتباين العينة.",
    related: ["probability"],
    view: "statistics",
  },
  {
    id: "probability",
    title: "الاحتمال التجريبي",
    english: "Probability coins dice conditional Bayes",
    category: "الاحتمالات",
    formula: "P(E)\\approx\\frac{N(E)}{N}",
    summary: "تكرار حدث في التجارب يقارب احتماله النظري.",
    detail:
      "في قطعة نقد عادلة P(صورة)=1/2. مع زيادة التجارب يميل التكرار النسبي للاقتراب، دون ضمان تحسن كل عينة.",
    when: "لمقارنة النماذج الاحتمالية بالتجربة.",
    why: "قانون الأعداد الكبيرة يربط المتوسطات التجريبية بالقيمة المتوقعة.",
    example: "480 صورة من 1000 رمية ⟹ احتمال تجريبي 0.48.",
    mistakes: "الاعتقاد أن النتائج السابقة تغيّر احتمال رمية مستقلة.",
    related: ["statistics", "combinations"],
    view: "probability",
  },
  {
    id: "sequences",
    title: "المتتاليات والمتسلسلات",
    english: "Sequences geometric arithmetic convergence series sigma",
    category: "المتتاليات",
    formula: "S_n=a\\frac{1-r^n}{1-r}\\quad(r\\ne1)",
    summary: "المتسلسلة الهندسية تجمع حدودًا تتغير بنسبة ثابتة.",
    detail:
      "إذا |r| < 1 فإن المجموع اللانهائي يساوي a/(1-r). إذا a ≠ 0 و|r| ≥ 1 فلا تتقارب المتسلسلة.",
    when: "لحساب مجموع نمو أو تناقص هندسي.",
    why: "طرح rS_n من S_n يلغي الحدود الوسطى ويبقي a-arⁿ.",
    example: "1 + 1/2 + 1/4 + … = 2",
    mistakes: "استخدام صيغة المجموع اللانهائي عندما |r| ≥ 1.",
    related: ["limits", "fourier"],
    view: "sequences",
  },
  {
    id: "fourier",
    title: "متسلسلة فورييه",
    english: "Fourier series square wave spectrum transforms",
    category: "التحويلات",
    formula:
      "f(t)\\sim\\frac{4}{\\pi}\\sum_{k=0}^{N-1}\\frac{\\sin((2k+1)t)}{2k+1}",
    summary: "جمع موجات بسيطة يمكن أن يقارب موجة معقدة.",
    detail:
      "الموجة المربعة تستخدم التوافقيات الفردية. قرب القفزات يبقى تجاوز غيبس حتى مع زيادة الحدود.",
    when: "لتحليل إشارات دورية إلى ترددات.",
    why: "الجيوب وجيوب التمام تشكل أساسًا متعامدًا للدوال الدورية الملائمة.",
    example: "أول حد: (4/π)sin(t)، ثم نضيف (4/3π)sin(3t).",
    mistakes: "توقع تقارب منتظم قرب القفزات.",
    related: ["unit-circle", "sequences"],
    view: "transforms",
  },
  {
    id: "euler",
    title: "صيغة أويلر",
    english: "Euler complex numbers polar argument",
    category: "الأعداد المركبة",
    formula: "e^{i\\theta}=\\cos\\theta+i\\sin\\theta",
    summary: "الأس المركب يمثل دورانًا على دائرة الوحدة.",
    detail:
      "كل عدد مركب غير صفري يمكن كتابته r eⁱθ، حيث r المقدار وθ زاوية الاتجاه.",
    when: "للتحويل بين الصورة الديكارتية والقطبية وتمثيل الدوران.",
    why: "متسلسلة الأس المركب تنقسم إلى جزء حقيقي هو متسلسلة cos وجزء تخيلي هو متسلسلة sin.",
    example: "eⁱπ + 1 = 0",
    mistakes: "نسيان تحديد الربع عند حساب زاوية العدد.",
    related: ["unit-circle", "fourier"],
    view: "complex",
  },
  {
    id: "gcd",
    title: "القاسم المشترك الأكبر",
    english: "GCD LCM primes factors modular Euclidean",
    category: "نظرية الأعداد",
    formula: "\\gcd(a,b)=\\gcd(b,a\\bmod b)",
    summary: "خوارزمية إقليدس تستبدل العددين بالمقسوم عليه والباقي.",
    detail:
      "نكرر حتى يصبح الباقي صفرًا؛ آخر باقي غير صفري هو القاسم المشترك الأكبر.",
    when: "لتبسيط الكسور وحساب القواسم والمضاعفات.",
    why: "كل قاسم مشترك لـa وb يقسم a-qb، والعكس صحيح.",
    example: "gcd(48,18)=gcd(18,12)=gcd(12,6)=6",
    mistakes: "خلط القاسم المشترك الأكبر بالمضاعف المشترك الأصغر.",
    related: ["combinations"],
    view: "numbers",
  },
  {
    id: "combinations",
    title: "التوافيق والتباديل",
    english: "Combinations permutations Pascal binomial combinatorics",
    category: "التوافقيات",
    formula: "\\binom{n}{r}=\\frac{n!}{r!(n-r)!}",
    summary: "التوافيق تعد اختيارات لا يهم ترتيبها.",
    detail:
      "التباديل P(n,r)=n!/(n-r)! حين يهم الترتيب. نقسمها على r! عندما لا يهم.",
    when: "لحساب عدد طرق الاختيار دون تكرار.",
    why: "كل مجموعة من r عناصر تظهر r! مرات إذا عددنا كل ترتيب على حدة.",
    example: "اختيار 2 من 5 يعطي 10 مجموعات.",
    mistakes: "استخدام التوافيق حين يكون الترتيب مهمًا.",
    related: ["probability", "square"],
    view: "combinatorics",
  },
];
export const functionFamilies = [
  ["خطية", "2*x+3"],
  ["تربيعية", "x^2-4"],
  ["تكعيبية", "x^3-3*x"],
  ["متعددة الحدود", "x^4-2*x^2"],
  ["نسبية", "1/x"],
  ["جذرية", "sqrt(x)"],
  ["أسية", "exp(x)"],
  ["لوغاريتمية", "log(x)"],
  ["مثلثية", "sin(x)"],
  ["مثلثية عكسية", "asin(x)"],
  ["قيمة مطلقة", "abs(x)"],
  ["مركبة", "sin(x^2)"],
  ["عكسية", "(x-3)/2"],
];
export const roadmap = [
  "المتباينات المركبة وخط الأعداد",
  "الدوال متعددة التعريف",
  "إنشاء هندسي حر: شعاع، قوس، مضلع",
  "المشتقات الجزئية والتدرج والتكاملات المزدوجة",
  "الحقول الاتجاهية والمعادلات التفاضلية",
  "القيم والمتجهات الذاتية",
  "الاحتمال الشرطي وقانون بايز",
  "تحويل لابلاس خطوة بخطوة",
  "حسابات وحفظ سحابي",
];
export function searchTopics(query: string) {
  const normalizeSearch = (text: string) =>
    text
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي");
  const words = normalizeSearch(query)
    .trim()
    .split(/\s+/)
    .filter(
      (word) =>
        word &&
        !["قانون", "قوانين", "صيغة", "formula", "theorem", "the"].includes(
          word,
        ),
    );
  if (!words.length) return topics;
  return topics.filter((topic) => {
    const haystack = normalizeSearch(
      `${topic.title} ${topic.english} ${topic.category} ${topic.formula} ${topic.summary}`,
    );
    return words.every((word) => haystack.includes(word));
  });
}
