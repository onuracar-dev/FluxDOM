## Project Snapshot

FluxDOM is an experimental web framework that compiles `.flow` single-file components into direct DOM operations instead of relying on a Virtual DOM. The project demonstrates compiler design, fine-grained reactivity, Vite integration, SSR-oriented package structure, and monorepo build orchestration.

- **Core idea:** automatically choose rendering strategy from component analysis while keeping runtime reactivity small.
- **Recent hardening:** generated artifacts were removed from source control, workspace builds were stabilized, and `{#if ...}{/if}` template blocks now compile correctly.
- **Validation:** `npm test` and `npm run build`.

<div align="center">
  <h1>🌊 FluxDOM</h1>
  <p><strong>The Adaptive Rendering Framework</strong></p>
</div>

---

## 🇬🇧 English

### What is FluxDOM and What Problem Does It Solve?
FluxDOM is a next-generation web framework designed to eliminate the mental overhead of choosing between Static Site Generation (SSG), Server-Side Rendering (SSR), and Client-Side Rendering (CSR). 

Traditionally, developers must configure their framework or manually split components to optimize for SEO, First Contentful Paint (FCP), or heavy interactivity. FluxDOM solves this by introducing **Adaptive Rendering**. Our intelligent compiler analyzes your `.flow` Single File Components at build-time. It detects the presence of reactive signals (`let` reassignments), async data fetching, and side effects. Based on this static analysis, FluxDOM automatically decides the optimal rendering strategy (SSG, SSR, CSR, or Partial Hydration) for each specific component without any configuration.

Furthermore, FluxDOM entirely drops the Virtual DOM. Reactivity is handled via fine-grained signals compiled directly to surgical DOM manipulation operations, yielding blazing-fast performance.

### Who is this for?
- **Frontend Developers** who want Vue/Svelte-like developer experience without the Virtual DOM overhead.
- **Architects** who want to stop arguing about SSR vs CSR and let the compiler handle it.
- **Performance Enthusiasts** looking for zero-overhead runtime reactivity.

### Installation & Setup

1. **Install the CLI globally (Optional)**
```bash
npm install -g @fluxdom/cli
```

2. **Create a new project**
```bash
flow create my-app
cd my-app
npm install
```

3. **Start the Development Server**
```bash
npm run dev
```

### How to Use FluxDOM (Logic & Architecture)

FluxDOM uses Single File Components (`.flow`). The architecture is split into 3 parts:
1. **`<script>`**: This is where you write standard JavaScript/TypeScript. The FluxDOM compiler automatically detects variable reassignments (`let count = 0; count++;`) and transforms them into reactive signals (`createSignal`) under the hood. You don't need to learn a new Reactivity API.
2. **`<template>`**: Your HTML markup. You can bind expressions directly using `{variable}`.
3. **`<style scoped>`**: Scoped CSS that automatically isolates styles to the current component.

#### Core Logic
- **No Virtual DOM**: The compiler transforms your `<template>` into raw `document.createElement` and `document.createTextNode` operations.
- **Auto-Tracking Effects**: The runtime automatically tracks which signals are read during the rendering phase and binds surgical update functions (like `setText`) directly to the DOM nodes.

### Usage Example

**`src/App.flow`**
```html
<script>
  // This is automatically transformed into a reactive signal!
  let count = 0;
  
  function increment() {
    count++; // Triggers a surgical DOM update natively
  }
</script>

<template>
  <div class="card">
    <h1>Welcome to FluxDOM 🌊</h1>
    <p>Adaptive Rendering in action.</p>
    
    <!-- Event binding is native -->
    <button @click="increment">
      Count is: {count}
    </button>
  </div>
</template>

<style scoped>
  .card {
    padding: 2rem;
    text-align: center;
  }
  button {
    background: #4f46e5;
    color: white;
    border-radius: 6px;
  }
</style>
```

---

## 🇹🇷 Türkçe

### FluxDOM Nedir ve Hangi Sorunu Çözer?
FluxDOM, geliştiricilerin Static Site Generation (SSG), Server-Side Rendering (SSR) ve Client-Side Rendering (CSR) arasında seçim yapma zorunluluğunu ortadan kaldıran yeni nesil bir web framework'üdür.

Geleneksel olarak, SEO, hızlı ilk yükleme (FCP) veya yüksek etkileşim sağlamak için framework ayarlarıyla boğuşmak veya komponentleri manuel olarak bölmek gerekir. FluxDOM, bu sorunu **Adaptif Rendering (Adaptive Rendering)** ile çözer. Akıllı derleyicimiz (compiler), `.flow` uzantılı dosyalarınızı build (derleme) aşamasında analiz eder. Reaktif sinyalleri (değiştirilen `let` değişkenleri), asenkron veri çekme işlemlerini ve yan etkileri (side effects) tespit eder. Bu statik analize dayanarak, FluxDOM her bir bileşen için en ideal render stratejisine (SSG, SSR, CSR veya Partial Hydration) **hiçbir ayar gerektirmeden otomatik olarak karar verir.**

Ayrıca FluxDOM, Virtual DOM (Sanal DOM) konseptini tamamen çöpe atar. Reaktiflik, doğrudan nokta atışı DOM manipülasyonlarına dönüştürülen "fine-grained" sinyallerle sağlanır. Bu da inanılmaz bir performans artışı sunar.

### Kimler İçindir?
- Virtual DOM yükü olmadan Vue/Svelte benzeri kolay ve akıcı bir geliştirici deneyimi isteyen **Frontend Geliştiricileri**.
- SSR mi yoksa CSR mi kullanmalıyız tartışmalarını bitirip, kararı derleyiciye bırakmak isteyen **Mimarlar**.
- Sıfır çalışma zamanı (runtime) yükü ve kusursuz hız arayan **Performans Tutkunları**.

### Detaylı Kurulum

1. **CLI Aracını Global Olarak Kurun (Opsiyonel)**
```bash
npm install -g @fluxdom/cli
```

2. **Yeni Bir Proje Oluşturun**
```bash
flow create my-app
cd my-app
npm install
```

3. **Geliştirme Sunucusunu Başlatın**
```bash
npm run dev
```

### FluxDOM Nasıl Kullanılır? (Proje Mantığı ve Mimari)

FluxDOM, Tek Dosyalı Bileşenler (Single File Components - `.flow`) kullanır. Mimari 3 ana kısımdan oluşur:
1. **`<script>`**: Standart JavaScript/TypeScript kodunuzu yazdığınız yerdir. FluxDOM derleyicisi, yeniden atanan değişkenleri (`let count = 0; count++;`) otomatik olarak algılar ve arka planda reaktif sinyallere (`createSignal`) dönüştürür. Yeni bir reaktivite API'si öğrenmenize gerek kalmaz.
2. **`<template>`**: HTML şablonunuz. `{degisken}` formatını kullanarak JavaScript verilerinizi doğrudan DOM'a bağlayabilirsiniz.
3. **`<style scoped>`**: Stilleri sadece o anki komponente özel hale getiren (izole eden) CSS alanıdır.

#### Çekirdek Mantık
- **Virtual DOM Yok**: Derleyici, `<template>` kısmınızı analiz eder ve doğrudan `document.createElement` ve `document.createTextNode` gibi ham tarayıcı API'lerine dönüştürür.
- **Otomatik Takip Eden Efektler (Auto-Tracking Effects)**: Çalışma zamanı (runtime), render aşamasında hangi sinyallerin okunduğunu otomatik olarak takip eder ve sadece o veriyi içeren spesifik DOM düğümüne bir güncelleme fonksiyonu (`setText`) bağlar. Veri değiştiğinde tüm sayfa değil, SADECE o metin değişir.

### Kullanım Örneği

**`src/App.flow`**
```html
<script>
  // Bu değişken derleyici tarafından otomatik olarak reaktif sinyale dönüştürülür!
  let count = 0;
  
  function increment() {
    count++; // Değer değiştiğinde DOM'da nokta atışı bir güncelleme tetiklenir
  }
</script>

<template>
  <div class="card">
    <h1>FluxDOM'e Hoş Geldiniz 🌊</h1>
    <p>Adaptif Rendering çalışıyor.</p>
    
    <!-- Event binding işlemleri doğal tarayıcı mantığıyla aynıdır -->
    <button @click="increment">
      Sayaç: {count}
    </button>
  </div>
</template>

<style scoped>
  .card {
    padding: 2rem;
    text-align: center;
  }
  button {
    background: #4f46e5;
    color: white;
    border-radius: 6px;
  }
</style>
```
