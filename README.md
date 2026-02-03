# 🃏 PokerChipTracker

Professional bankroll and game management for your home poker nights. Track buy-ins, loans, and settlements with precision.

## 📋 Overview

PokerChipTracker is a comprehensive web application designed to help you manage your home poker games with professional precision. Whether you're hosting a casual game with friends or running regular poker nights, this tool simplifies the complex task of tracking buy-ins, loans between players, cash-outs, and final settlements.

## ✨ Features

- **Player Management**: Add and manage players throughout the game
- **Buy-in Tracking**: Record each player's initial and additional buy-ins
- **Loan System**: Track money lent between players during the game
- **Cash-out Processing**: Record when players leave and cash out their chips
- **Settlement Calculation**: Automatically calculate who owes whom at the end of the game
- **Real-time Balances**: View each player's current chip count and net position
- **Transaction History**: Complete audit trail of all game activities
- **Persistent Storage**: All game data is saved locally in your browser

## 🚀 Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager


## 🎮 How to Use

### Starting a New Game

1. Click "Add Player" to add participants to your game
2. Enter each player's initial buy-in amount
3. The system will start tracking all transactions

### During the Game

- **Additional Buy-ins**: Click on a player to record when they buy more chips
- **Loans**: Use the loan feature to track money borrowed between players
- **Cash-outs**: Record when a player leaves and cashes out their remaining chips

### Ending the Game

1. Navigate to the "Settlement" tab
2. Review the automatically calculated settlements
3. The system shows the most efficient way to settle all debts

## 🛠️ Technology Stack

- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Storage**: Browser LocalStorage
- **Styling**: CSS/Tailwind (based on project configuration)

## 📁 Project Structure

```
PokerChipTracker/
├── components/        # React components
├── services/          # Business logic and data management
├── App.tsx           # Main application component
├── index.tsx         # Application entry point
├── types.ts          # TypeScript type definitions
├── package.json      # Project dependencies
└── vite.config.ts    # Vite configuration
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 📧 Contact

For questions, suggestions, or issues, please open an issue on GitHub.

---
## 🎯 Roadmap

Future enhancements being considered:

- [ ] Multi-game history tracking
- [ ] Export game reports to PDF
- [ ] Cloud sync for game data
- [ ] Mobile app version
- [ ] Tournament mode support
- [ ] Statistics and analytics dashboard

---

Made with ♠️♥️♣️♦️ for poker enthusiasts
