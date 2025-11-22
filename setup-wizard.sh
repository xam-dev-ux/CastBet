#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${PURPLE}"
cat << "EOF"
   ____          _   ____       _
  / ___|__ _ ___| |_| __ )  ___| |_
 | |   / _` / __| __|  _ \ / _ \ __|
 | |__| (_| \__ \ |_| |_) |  __/ |_
  \____\__,_|___/\__|____/ \___|\__|

  Setup Wizard - Complete Configuration
EOF
echo -e "${NC}"

# Functions
print_step() {
    echo -e "\n${CYAN}==> $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

ask_question() {
    echo -e "${BLUE}$1${NC}"
    read -p "> " answer
    echo "$answer"
}

ask_yes_no() {
    while true; do
        echo -e "${BLUE}$1 (y/n)${NC}"
        read -p "> " yn
        case $yn in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please answer yes (y) or no (n).";;
        esac
    done
}

# Start wizard
echo -e "${GREEN}Welcome to CastBet Setup Wizard!${NC}"
echo "This wizard will help you configure and deploy your CastBet application."
echo ""

# Check if .env exists
if [ -f .env ]; then
    print_warning ".env file already exists!"
    if ask_yes_no "Do you want to overwrite it?"; then
        rm .env
        print_success "Existing .env removed"
    else
        print_error "Setup cancelled. Please backup your .env file first."
        exit 1
    fi
fi

# Step 1: Node modules
print_step "Step 1: Dependencies"
if [ ! -d "node_modules" ]; then
    if ask_yes_no "Install npm dependencies?"; then
        npm install
        print_success "Dependencies installed"
    else
        print_warning "Skipping dependency installation"
    fi
else
    print_success "Dependencies already installed"
fi

# Step 2: Blockchain Configuration
print_step "Step 2: Blockchain Configuration"
echo ""

PRIVATE_KEY=$(ask_question "Enter your wallet private key (with or without 0x prefix):")

# Clean the private key: remove ALL non-hexadecimal characters (including spaces, newlines, 0x prefix, etc.)
PRIVATE_KEY=$(echo "$PRIVATE_KEY" | tr -cd '0-9a-fA-Fx')
# Remove 0x prefix if present
PRIVATE_KEY=${PRIVATE_KEY#0x}
PRIVATE_KEY=${PRIVATE_KEY#0X}
# Keep only hexadecimal characters
PRIVATE_KEY=$(echo "$PRIVATE_KEY" | tr -cd '0-9a-fA-F')

# Auto-fix: If length is 65 and ends with 0, it's likely a copy error from MetaMask
if [ ${#PRIVATE_KEY} -eq 65 ] && [[ "$PRIVATE_KEY" =~ 0$ ]]; then
    print_warning "Detected extra '0' at the end, removing it..."
    PRIVATE_KEY=${PRIVATE_KEY%0}
fi

# Validate length
while [ ${#PRIVATE_KEY} -ne 64 ]; do
    print_error "Invalid private key length. Got ${#PRIVATE_KEY} characters, need 64."
    print_warning "Private key should be 64 hexadecimal characters (32 bytes)"

    # Show a sample of what was entered (first and last 8 chars for security)
    if [ ${#PRIVATE_KEY} -gt 16 ]; then
        SAMPLE="${PRIVATE_KEY:0:8}...${PRIVATE_KEY: -8}"
        echo -e "${YELLOW}You entered: $SAMPLE (${#PRIVATE_KEY} chars total)${NC}"

        # Debug: show if there are hidden characters
        VISIBLE_ONLY=$(echo "$PRIVATE_KEY" | tr -cd '0-9a-fA-F')
        if [ ${#VISIBLE_ONLY} -ne ${#PRIVATE_KEY} ]; then
            echo -e "${RED}Detected ${NC}$((${#PRIVATE_KEY} - ${#VISIBLE_ONLY}))${RED} non-hexadecimal characters!${NC}"
            echo -e "${YELLOW}After cleaning: ${#VISIBLE_ONLY} hex characters${NC}"
        fi

        # If it's close to 64, show the full key for debugging (masked in middle)
        if [ ${#PRIVATE_KEY} -ge 60 ] && [ ${#PRIVATE_KEY} -le 70 ]; then
            echo -e "${YELLOW}Formatted: ${PRIVATE_KEY:0:32}|${PRIVATE_KEY:32}${NC}"
            echo -e "${YELLOW}Character count check: First half=${#PRIVATE_KEY:0:32}, Second half=$((${#PRIVATE_KEY}-32))${NC}"
        fi
    fi

    PRIVATE_KEY=$(ask_question "Enter your wallet private key (with or without 0x prefix):")
    # Clean it again - remove ALL non-hexadecimal characters
    PRIVATE_KEY=$(echo "$PRIVATE_KEY" | tr -cd '0-9a-fA-Fx')
    PRIVATE_KEY=${PRIVATE_KEY#0x}
    PRIVATE_KEY=${PRIVATE_KEY#0X}
    PRIVATE_KEY=$(echo "$PRIVATE_KEY" | tr -cd '0-9a-fA-F')

    # Auto-fix again
    if [ ${#PRIVATE_KEY} -eq 65 ] && [[ "$PRIVATE_KEY" =~ 0$ ]]; then
        print_warning "Detected extra '0' at the end, removing it..."
        PRIVATE_KEY=${PRIVATE_KEY%0}
    fi
done

# Validate it's hexadecimal
if ! [[ "$PRIVATE_KEY" =~ ^[0-9a-fA-F]{64}$ ]]; then
    print_error "Private key must contain only hexadecimal characters (0-9, a-f, A-F)"
    exit 1
fi

print_success "Private key validated (${#PRIVATE_KEY} characters)"

echo ""
echo "Select Base network for deployment:"
echo "1) Base Sepolia (Testnet) - Recommended for testing"
echo "2) Base Mainnet"
read -p "> " network_choice

case $network_choice in
    1)
        NETWORK="baseSepolia"
        NETWORK_NAME="Base Sepolia"
        CHAIN_ID=84532
        RPC_URL="https://sepolia.base.org"
        ;;
    2)
        NETWORK="base"
        NETWORK_NAME="Base Mainnet"
        CHAIN_ID=8453
        RPC_URL="https://mainnet.base.org"
        ;;
    *)
        print_error "Invalid choice. Defaulting to Base Sepolia"
        NETWORK="baseSepolia"
        NETWORK_NAME="Base Sepolia"
        CHAIN_ID=84532
        RPC_URL="https://sepolia.base.org"
        ;;
esac

print_success "Selected network: $NETWORK_NAME (Chain ID: $CHAIN_ID)"

# Step 3: Etherscan API Key
print_step "Step 3: Etherscan API Key (for contract verification)"
echo ""
echo -e "${CYAN}Note: Basescan has migrated to Etherscan API V2${NC}"
echo -e "Get your API key from: ${YELLOW}https://etherscan.io/myapikey${NC}"
echo ""
ETHERSCAN_API_KEY=$(ask_question "Enter your Etherscan API key:")

# Step 4: WalletConnect Project ID
print_step "Step 4: WalletConnect Configuration"
echo ""
WALLETCONNECT_PROJECT_ID=$(ask_question "Enter your WalletConnect Project ID (get it from https://cloud.walletconnect.com):")

# Step 5: Application URL
print_step "Step 5: Application Configuration"
echo ""
APP_URL=$(ask_question "Enter your application URL (e.g., https://castbet.app or http://localhost:3000):")

# Create .env file
print_step "Creating .env file..."
cat > .env << EOF
# Deployment Keys
PRIVATE_KEY=$PRIVATE_KEY

# RPC Endpoints
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_RPC_URL=https://mainnet.base.org

# Etherscan API Key (V2)
ETHERSCAN_API_KEY=$ETHERSCAN_API_KEY

# Frontend - Contract Addresses (will be updated after deployment)
NEXT_PUBLIC_CASTBET_ADDRESS=
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Frontend - WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$WALLETCONNECT_PROJECT_ID

# Frontend - Chain
NEXT_PUBLIC_CHAIN_ID=$CHAIN_ID

# Farcaster
NEXT_PUBLIC_FARCASTER_HUB_URL=https://hub.farcaster.xyz
NEXT_PUBLIC_APP_URL=$APP_URL

# Optional
REPORT_GAS=true
EOF

print_success ".env file created"

# Step 6: Compile contracts
print_step "Step 6: Smart Contract Compilation"
if ask_yes_no "Compile smart contracts?"; then
    npm run compile
    if [ $? -eq 0 ]; then
        print_success "Contracts compiled successfully"
    else
        print_error "Contract compilation failed"
        exit 1
    fi
else
    print_warning "Skipping contract compilation"
fi

# Step 7: Run tests
print_step "Step 7: Smart Contract Tests"
if ask_yes_no "Run smart contract tests?"; then
    npm test
    if [ $? -eq 0 ]; then
        print_success "All tests passed"
    else
        print_error "Some tests failed"
        if ! ask_yes_no "Continue anyway?"; then
            exit 1
        fi
    fi
else
    print_warning "Skipping tests"
fi

# Step 8: Deploy contracts
print_step "Step 8: Smart Contract Deployment"
echo ""
echo -e "${YELLOW}WARNING: This will deploy contracts to $NETWORK_NAME${NC}"
echo -e "${YELLOW}Make sure your wallet has enough funds for gas fees!${NC}"
echo ""

if ask_yes_no "Deploy contracts now?"; then
    echo ""
    print_step "Deploying to $NETWORK_NAME..."

    # Run deployment and capture output
    DEPLOY_OUTPUT=$(npm run deploy:$NETWORK 2>&1)
    echo "$DEPLOY_OUTPUT"

    if [ $? -eq 0 ]; then
        print_success "Contracts deployed successfully!"

        # Extract contract addresses from deployment output
        USDC_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "NEXT_PUBLIC_USDC_ADDRESS=" | cut -d'=' -f2)
        CASTBET_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "NEXT_PUBLIC_CASTBET_ADDRESS=" | cut -d'=' -f2)

        if [ -n "$USDC_ADDRESS" ] && [ -n "$CASTBET_ADDRESS" ]; then
            # Update .env with contract addresses
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s|NEXT_PUBLIC_USDC_ADDRESS=.*|NEXT_PUBLIC_USDC_ADDRESS=$USDC_ADDRESS|" .env
                sed -i '' "s|NEXT_PUBLIC_CASTBET_ADDRESS=.*|NEXT_PUBLIC_CASTBET_ADDRESS=$CASTBET_ADDRESS|" .env
            else
                # Linux
                sed -i "s|NEXT_PUBLIC_USDC_ADDRESS=.*|NEXT_PUBLIC_USDC_ADDRESS=$USDC_ADDRESS|" .env
                sed -i "s|NEXT_PUBLIC_CASTBET_ADDRESS=.*|NEXT_PUBLIC_CASTBET_ADDRESS=$CASTBET_ADDRESS|" .env
            fi

            print_success "Contract addresses updated in .env file"
            echo ""
            echo -e "${GREEN}Contract Addresses:${NC}"
            echo -e "USDC: ${CYAN}$USDC_ADDRESS${NC}"
            echo -e "CastBet: ${CYAN}$CASTBET_ADDRESS${NC}"
        fi
    else
        print_error "Deployment failed!"
        exit 1
    fi
else
    print_warning "Skipping deployment"
fi

# Step 9: Git Configuration
print_step "Step 9: Git & GitHub Configuration"
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    if ask_yes_no "Initialize git repository?"; then
        git init
        print_success "Git repository initialized"
    else
        print_warning "Skipping git initialization"
        GIT_SKIP=true
    fi
fi

if [ "$GIT_SKIP" != "true" ]; then
    # Check for .gitignore
    if [ ! -f .gitignore ]; then
        print_warning ".gitignore not found, but this shouldn't happen"
    fi

    # Add all files
    if ask_yes_no "Add files to git?"; then
        git add .
        print_success "Files added to git"

        # Commit
        COMMIT_MESSAGE=$(ask_question "Enter commit message (default: 'Initial CastBet setup'):")
        if [ -z "$COMMIT_MESSAGE" ]; then
            COMMIT_MESSAGE="Initial CastBet setup"
        fi

        git commit -m "$COMMIT_MESSAGE"
        print_success "Changes committed"
    fi

    # GitHub remote
    if ask_yes_no "Add GitHub remote repository?"; then
        GITHUB_REPO=$(ask_question "Enter GitHub repository URL (e.g., https://github.com/username/castbet.git):")

        # Check if remote already exists
        if git remote | grep -q origin; then
            git remote remove origin
        fi

        git remote add origin "$GITHUB_REPO"
        print_success "GitHub remote added"

        # Push to GitHub
        if ask_yes_no "Push to GitHub now?"; then
            echo ""
            echo "Select branch name:"
            echo "1) main (recommended)"
            echo "2) master"
            echo "3) custom"
            read -p "> " branch_choice

            case $branch_choice in
                1) BRANCH="main";;
                2) BRANCH="master";;
                3) BRANCH=$(ask_question "Enter branch name:");;
                *) BRANCH="main";;
            esac

            # Rename branch if needed
            CURRENT_BRANCH=$(git branch --show-current)
            if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
                git branch -M "$BRANCH"
            fi

            git push -u origin "$BRANCH"

            if [ $? -eq 0 ]; then
                print_success "Pushed to GitHub successfully!"
            else
                print_error "Push failed. You may need to authenticate or check your repository settings."
            fi
        fi
    fi
fi

# Step 10: Final summary
print_step "Setup Complete!"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         CastBet Setup Completed! 🎉           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Configuration Summary:${NC}"
echo -e "  Network: ${GREEN}$NETWORK_NAME${NC}"
echo -e "  Chain ID: ${GREEN}$CHAIN_ID${NC}"
echo -e "  App URL: ${GREEN}$APP_URL${NC}"
echo ""

if [ -n "$CASTBET_ADDRESS" ]; then
    echo -e "${CYAN}Deployed Contracts:${NC}"
    echo -e "  USDC: ${GREEN}$USDC_ADDRESS${NC}"
    echo -e "  CastBet: ${GREEN}$CASTBET_ADDRESS${NC}"
    echo ""
fi

echo -e "${CYAN}Next Steps:${NC}"
echo -e "  1. ${YELLOW}npm run dev${NC} - Start the development server"
echo -e "  2. Visit ${YELLOW}$APP_URL${NC}"
echo -e "  3. Test your betting frames!"
echo ""
echo -e "${CYAN}Useful Commands:${NC}"
echo -e "  ${YELLOW}npm run build${NC} - Build for production"
echo -e "  ${YELLOW}npm run start${NC} - Start production server"
echo -e "  ${YELLOW}npm test${NC} - Run contract tests"
echo -e "  ${YELLOW}npm run test:coverage${NC} - Run tests with coverage"
echo ""
echo -e "${GREEN}Happy betting! 🎲${NC}"
