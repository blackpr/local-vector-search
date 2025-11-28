# Second Brain: Local Vector Search Engine

A privacy-first, offline-capable semantic search engine running entirely in your browser. Built with **React**, **SQLite WASM**, and **Transformers.js**.

## 🚀 Features

-   **100% Private & Offline**: No data ever leaves your device. All inference and storage happen locally.
-   **Semantic Search**: Find notes by meaning, not just keywords (e.g., "cooking" finds "pasta recipe").
-   **High Performance**:
    -   **Web Workers**: Heavy AI and DB operations run off the main thread.
    -   **WebGPU / WASM**: Accelerated inference using the latest browser capabilities.
    -   **OPFS (Origin Private File System)**: High-performance persistent storage for SQLite.
-   **Modern UI**: Built with Tailwind CSS v4 and Lucide icons.

## 🛠 Architecture

This project pushes the boundaries of what's possible in a browser:

1.  **AI Model**: `EmbeddingGemma-300M` (quantized ONNX) runs via `transformers.js`.
2.  **Vector Database**: `sqlite-vec` (SQLite extension) performs L2 distance calculations on embeddings.
3.  **Concurrency**: `SharedArrayBuffer` and `Web Workers` ensure the UI remains 60fps smooth.

## 📦 Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/local-vector-search.git
    cd local-vector-search
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

    *Note: This project requires `SharedArrayBuffer`. The dev server is configured to send the necessary COOP/COEP headers.*

## 🚀 Deployment (GitHub Pages)

This project relies on `SharedArrayBuffer`, which requires the page to be "cross-origin isolated". GitHub Pages does not support sending the required headers natively.

To solve this, we use `coi-serviceworker`, a production-grade polyfill that reloads the page with a Service Worker to inject the headers client-side.

1.  Build the project:
    ```bash
    npm run build
    ```

2.  Deploy the `dist` folder to GitHub Pages (or use a GH Action).

## 🧠 Technical Details

-   **Model**: `onnx-community/embeddinggemma-300m-ONNX` (~300MB compressed, downloaded once).
-   **Storage**: SQLite stored in OPFS (`/notes.db`). If OPFS is unavailable, it falls back to in-memory storage.
-   **Styling**: Tailwind CSS v4 (using the new `@theme` and engine).

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📄 License

beerware
