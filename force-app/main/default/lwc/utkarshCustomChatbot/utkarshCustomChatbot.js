import { LightningElement ,api, track} from 'lwc';
import startChatSession from '@salesforce/apex/EinsteinChatController.startChatSession';
import sendChatMessage from '@salesforce/apex/EinsteinChatController.sendChatMessage';
import translateMessegeFromUser from '@salesforce/apex/EinsteinChatController.translateMessegeFromUser';
import translateMessegeFromAgent from '@salesforce/apex/EinsteinChatController.translateMessegeFromAgent';


export default class UtkarshCustomChatbot extends LightningElement {

    @api recordId;
    @api agentforceAgentId;
    @track userChoosenLang = '';
    
    // --- 1. CORE UI STATE VARIABLES ---
    @track isOpen = false;
    @track isListening = false;
    @track isLoading = false;
    
    // --- 2. CHAT DATA VARIABLES (Missing previously!) ---
    @track messages = []; 
    sessionId = '';
    agentJoinedMessage = 'Agent has joined the chat.';
    agentLoadingMessage = 'Agent is typing...';
    
    // --- 3. INPUT VARIABLES ---
    @track userInput = '';
    @track isProcessing = false;
    @track isInputDisabled = false;
    placeholderText = 'Type your message...';
    selectedLang = 'en-US';

    // --- GETTERS ---
    get chatIconClass() { return this.isOpen ? 'chat-bubble hidden' : 'chat-bubble visible'; }
    get inputWrapperClass() { return this.isInputDisabled ? 'input-wrapper disabled-bg' : 'input-wrapper'; }
    get micClass() { return this.isListening ? 'mic-btn listening' : 'mic-btn'; }
    get micVariant() { return this.isListening ? 'error' : 'inverse'; }

    get engChipClass() { return this.selectedLang === 'en-US' ? 'lang-chip active' : 'lang-chip'; }
    get hinChipClass() { return this.selectedLang === 'hi-IN' ? 'lang-chip active' : 'lang-chip'; }
    get benChipClass() { return this.selectedLang === 'bn-IN' ? 'lang-chip active' : 'lang-chip'; }

    // --- LANGUAGE SETUP ---
    setEnglish() { 
        this.selectedLang = 'en-US'; 
        this.userChoosenLang = 'English';
    }
    setHindi()   { 
        this.selectedLang = 'hi-IN';
        this.userChoosenLang = 'Hindi';
     }
    setBengali() { 
        this.selectedLang = 'bn-IN'; 
        this.userChoosenLang = 'Bengali';
    }

    // --- CHAT TOGGLE & INITIALIZATION ---
    async toggleChat() {
        this.isOpen = !this.isOpen;

        // ONLY start a new session if the chat is opening AND we don't already have a session
        if (this.isOpen && !this.sessionId) {
            this.isLoading = true;
            this.isInputDisabled = true; // Prevent typing while connecting

            try {
                // Call Apex to get session ID and welcome message
                const welcomeMsgObj = await startChatSession({ AgentId: this.agentforceAgentId , OppID: this.recordId });
                this.sessionId = welcomeMsgObj.sessionId;

                const now = new Date();
                const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                const dateString = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

                // Update the tracked messages array to trigger UI re-render
                this.messages = [
                    { id: Date.now(), text: `${dateString} • ${timeString}`, isSystem: true },
                    { id: Date.now() + 1, text: this.agentJoinedMessage, isSystem: true },
                    { id: Date.now() + 2, text: welcomeMsgObj.message, isBot: true }
                ];
            } catch (error) {
                console.error('Error starting chat session:', error);
                this.messages = [
                    { id: Date.now(), text: 'Failed to start chat session. Please try again later.', isSystem: true }
                ];
            } finally {
                this.isLoading = false;
                this.isInputDisabled = false;
            }
        }
    }

    // --- INPUT HANDLING ---
    handleInputChange(event) {
        this.userInput = event.target.value;
    }

    handleKeyDown(event) {
        if (event.key === 'Enter') {
            this.handleSend();
        }
    }

    // --- SEND MESSAGE ---
   async handleSend() {
        if (!this.userInput || !this.sessionId) return;
        
        this.isProcessing = true;
        this.isInputDisabled = true;
        
        // Add user message to UI immediately
        const userText = this.userInput;

        const promptResponse = await translateMessegeFromUser({
                message: userText
            });

            console.log('Prompt template response:', promptResponse);

        this.messages = [...this.messages, { id: Date.now(), text: userText, isUser: true }];
        this.userInput = ''; // clear input field
        
        try {
            // 2. ADD 'await' to wait for the Apex response
            const response = await sendChatMessage({
                sessionId: this.sessionId,
                message: promptResponse
            });
            
            console.log('Bot response:', response);

            const promptResponse2 = await translateMessegeFromAgent({
                message: response,
                selectedLanguage: this.userChoosenLang
            });

             console.log('Translated Bot response:', promptResponse2);
            
            // 3. ADD the bot's response to the chat UI
            this.messages = [...this.messages, { id: Date.now() + 1, text: promptResponse2, isBot: true }];

        } catch (error) {
            console.error('Error sending message:', error);
            this.messages = [...this.messages, { 
                id: Date.now() + 1, 
                text: 'Sorry, I encountered an error. Please try again.', 
                isSystem: true 
            }];
        } finally {
            // 4. Remove the fake timeout and unlock the UI here
            this.isProcessing = false;
            this.isInputDisabled = false;
            
            // Optional: Scroll to bottom of chat automatically
            setTimeout(() => {
                const container = this.template.querySelector('.chat-messages');
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }, 50);
        }
    }

    // --- SPEECH RECOGNITION ---
    handleListen() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Your browser does not support speech recognition.');
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = this.selectedLang;
        recognition.interimResults = false;
        this.isListening = true;
        recognition.start();
        
        recognition.onresult = e => { 
            this.userInput = e.results[0][0].transcript; 
            this.isListening = false; 
        };
        console.log('userinput', this.userInput);
        recognition.onerror = () => { this.isListening = false; };
        recognition.onspeechend = () => { recognition.stop(); this.isListening = false; };
    }
}