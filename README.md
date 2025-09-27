# GAN Cube Windows App

A native Windows desktop application for connecting to and interacting with GAN Smart Cubes via Bluetooth. This app provides real-time cube state monitoring, move tracking, and 3D visualization.

**Based on**: This project ports [afedotov's gan-web-bluetooth library](https://github.com/afedotov/gan-web-bluetooth) and [gan-cube-sample web app](https://github.com/afedotov/gan-cube-sample) to a native Windows desktop application using Tauri.

## Features

- **Bluetooth Connectivity**: Connect to GAN Smart Cubes (356i, 356i3, 11M Pro, 12M, 13M, etc.)
- **Real-time Data**: Live cube state updates including:
  - Clock Skew timing information
  - Quaternion orientation data
  - Angular velocity measurements
  - Move time deltas
- **3D Visualization**: Interactive 3D cube representation with real-time rotations
- **Move Detection**: Track and display cube moves as they happen
- **Native Performance**: Built with Tauri for optimal Windows performance

## Technology Stack

- **Frontend**: TypeScript, HTML5, CSS3
- **3D Graphics**: Three.js for quaternion calculations and cube visualization
- **Cubing Library**: For 3D cube rendering and state management
- **Bluetooth**: Web Bluetooth API for GAN cube communication
- **Desktop Framework**: Tauri 2.8 (Rust + Web technologies)
- **Build Tool**: Vite
- **Libraries**:
  - jQuery for DOM manipulation
  - RxJS for reactive programming
  - AES-JS for cube encryption protocols

## Prerequisites

- Windows 10 or later
- Node.js 18+ 
- Rust (for development)
- Bluetooth adapter with BLE support
- Compatible GAN Smart Cube

## Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/[username]/gan-cube-windows-app.git
   cd gan-cube-windows-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install Rust** (if not already installed):
   - Visit [rustup.rs](https://rustup.rs/) and follow the installation instructions

4. **Install Tauri CLI**:
   ```bash
   npm install -g @tauri-apps/cli
   ```

5. **Run in development mode**:
   ```bash
   npm run tauri dev
   ```

## Building for Production

1. **Build the application**:
   ```bash
   npm run tauri build
   ```

2. The built executable will be available in `src-tauri/target/release/`

## Usage

1. **Launch the application**
2. **Turn on your GAN Smart Cube** and ensure it's in pairing mode
3. **Click "Connect to GAN Cube"** in the app
4. **Select your cube** from the Bluetooth device list
5. **Start cubing!** The app will display real-time data as you manipulate the cube

## Supported GAN Cubes

- GAN 356 i
- GAN 356 i3
- GAN 11 M Pro
- GAN 12 M
- GAN 13 M
- Other GAN Smart Cubes with Bluetooth connectivity

## Project Structure

```
gan-cube-windows-main/
├── src/
│   ├── main.ts          # Main application logic
│   ├── style.css        # Application styles
│   └── lib/             # GAN Bluetooth library
│       ├── gan-cube-definitions.ts
│       ├── gan-cube-encrypter.ts
│       ├── gan-cube-protocol.ts
│       ├── gan-smart-cube.ts
│       └── gan-smart-timer.ts
├── src-tauri/           # Tauri backend (Rust)
├── index.html           # Main HTML template
├── package.json         # Node.js dependencies
├── tauri.conf.json      # Tauri configuration
└── vite.config.ts       # Vite build configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Bluetooth Connection Issues
- Ensure your GAN cube is in pairing mode (usually indicated by blinking lights)
- Make sure Bluetooth is enabled on your Windows machine
- Try resetting the cube if connection fails

### Build Issues
- Ensure you have the latest version of Rust installed
- Clear node_modules and reinstall dependencies: `rm -rf node_modules && npm install`
- Check that all prerequisites are properly installed

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **[afedotov](https://github.com/afedotov)** for the original GAN Bluetooth implementations:
  - [gan-web-bluetooth](https://github.com/afedotov/gan-web-bluetooth) - Core Bluetooth protocol library
  - [gan-cube-sample](https://github.com/afedotov/gan-cube-sample) - Reference web implementation
- **GAN Robotics** for creating the smart cube technology
- **Tauri Team** for the excellent desktop app framework  
- **cubing.js** community for the cubing algorithms and 3D visualization tools

## Related Projects

- [gan-web-bluetooth](https://github.com/afedotov/gan-web-bluetooth) - Original web-based GAN cube interface
- [gan-cube-sample](https://github.com/afedotov/gan-cube-sample) - Sample web implementation
- [cubing.js](https://github.com/cubing/cubing.js) - Cubing algorithms and visualization library

---

**Note**: This is an unofficial project and is not affiliated with GAN Robotics. GAN is a trademark of GAN Robotics.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
