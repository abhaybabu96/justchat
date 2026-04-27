import { useState, useEffect, useRef } from "react";
import socket from "./socket";
import { nanoid } from "nanoid";
import {
  saveMessages,
  loadMessages,
  clearMessages,
  isSaved,
  getTimeLeft,
} from "./storage";
import "./index.css";

// ── Root App ─────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home");
  const [roomCode, setRoomCode] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [onlineCount, setOnlineCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [saved, setSaved] = useState(() => isSaved());
  const [myCode] = useState(() => nanoid(7).toUpperCase());
  const typingTimer = useRef(null);
  const bottomRef = useRef(null);

  // ── Socket listeners ──────────────────────────────────
  useEffect(() => {
    socket.on("receive-message", ({ text }) =>
      setMessages((p) => [...p, { text, sender: "them" }]),
    );
    socket.on("user-count", setOnlineCount);
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop-typing", () => setIsTyping(false));
    return () => {
      socket.off("receive-message");
      socket.off("user-count");
      socket.off("typing");
      socket.off("stop-typing");
    };
  }, []);

  // ── Auto scroll ────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Room actions ───────────────────────────────────────
  const startRoom = () => {
    socket.connect();
    socket.emit("join-room", myCode);
    setRoomCode(myCode);
    setMessages(loadMessages(myCode));
    setSaved(isSaved());
    setScreen("chat");
  };

  const joinRoom = () => {
    const code = joinInput.trim().toUpperCase();
    if (code.length < 3) {
      setError("Enter a valid room code");
      return;
    }
    socket.connect();
    socket.emit("join-room", code);
    setRoomCode(code);
    setMessages(loadMessages(code));
    setSaved(isSaved());
    setScreen("chat");
  };

  const leaveRoom = () => {
    socket.disconnect();
    // Note: we do NOT clear localStorage on leave
    // so the saved chat survives if they saved it
    setMessages([]);
    setRoomCode("");
    setOnlineCount(0);
    setIsTyping(false);
    setInput("");
    setSaved(isSaved());
    setScreen("home");
  };

  // ── Save handlers ──────────────────────────────────────
  const handleSave = () => {
    saveMessages(roomCode, messages);
    setSaved(true);
  };

  const handleClearSave = () => {
    clearMessages();
    setSaved(false);
  };

  // ── Messaging ──────────────────────────────────────────
  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((p) => [...p, { text, sender: "me" }]);
    socket.emit("send-message", { code: roomCode, text });
    socket.emit("stop-typing", roomCode);
    clearTimeout(typingTimer.current);
    setInput("");
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    socket.emit("typing", roomCode);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(
      () => socket.emit("stop-typing", roomCode),
      1500,
    );
  };

  if (screen === "chat")
    return (
      <ChatScreen
        roomCode={roomCode}
        messages={messages}
        input={input}
        isTyping={isTyping}
        onlineCount={onlineCount}
        onInputChange={handleTyping}
        onSend={sendMessage}
        onLeave={leaveRoom}
        bottomRef={bottomRef}
        saved={saved}
        onSave={handleSave}
        onClearSave={handleClearSave}
      />
    );

  return (
    <HomeScreen
      myCode={myCode}
      onStart={startRoom}
      onJoin={joinRoom}
      joinInput={joinInput}
      setJoinInput={setJoinInput}
      error={error}
      setError={setError}
    />
  );
}

// copy code
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // reset after 2s
    });
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy room code"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 5px",
        borderRadius: 7,
        cursor: "pointer",
        fontSize: 12,
        fontFamily: "var(--font-sans)",
        fontWeight: 500,
        border: `1px solid ${copied ? "var(--green-bdr)" : "var(--border2)"}`,
        background: copied ? "var(--green-bg)" : "var(--bg3)",
        color: copied ? "var(--green)" : "var(--text2)",
        transition: "all 0.2s",
      }}
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M1.5 6L4.5 9L10.5 3"
              stroke="#16a34a"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect
              x="4"
              y="4"
              width="7"
              height="7"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M2 8V2.5A1.5 1.5 0 0 1 3.5 1H8"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}
// ── Home Screen ───────────────────────────────────────────
function HomeScreen({
  myCode,
  onStart,
  onJoin,
  joinInput,
  setJoinInput,
  error,
  setError,
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          animation: "fadeUp .35s ease both",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--accent-bg)",
            border: "1px solid var(--accent-bdr)",
            borderRadius: 20,
            padding: "4px 12px",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--accent)",
              animation: "pulse 2s infinite",
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--accent)",
              letterSpacing: 0.5,
            }}
          >
            justchat
          </span>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: 26,
            fontWeight: 300,
            color: "var(--text)",
            lineHeight: 1.25,
            marginBottom: 10,
          }}
        >
          Simple, private chats.
          <br />
          <span style={{ fontWeight: 500 }}>No trace left behind.</span>
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text2)",
            lineHeight: 1.65,
            maxWidth: 320,
            marginBottom: 28,
          }}
        >
          Your conversation belongs only to you — no accounts, no servers
          storing your words, no history. The moment you refresh, it's gone.
        </p>

        {/* Code card */}
        <div
          style={{
            background: "var(--bg2)",
            border: "1.5px solid var(--border2)",
            borderRadius: 14,
            padding: 22,
            marginBottom: 12,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 80,
              height: 80,
              background: "var(--accent-bg)",
              borderRadius: "0 14px 0 80px",
              opacity: 0.5,
            }}
          />

          <div
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--text3)",
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Your private room code
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              marginBottom: 6,
            }}
          >
            <div
              style={{
                fontSize: 30,
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                letterSpacing: 8,
                color: "var(--text)",
              }}
            >
              {myCode}
            </div>
            <CopyButton text={myCode} />
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text3)",
              marginBottom: 18,
              lineHeight: 1.5,
            }}
          >
            Share this with one person only. It resets on every refresh.
          </div>

          {/* Privacy badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--green-bg)",
              border: "1px solid var(--green-bdr)",
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 16,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path
                d="M2 6.5L5 9.5L11 3.5"
                stroke="#16a34a"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{ fontSize: 12, color: "var(--green)", fontWeight: 500 }}
            >
              Your chat is completely private
            </span>
          </div>

          <button
            onClick={onStart}
            style={{
              width: "100%",
              padding: "12px 0",
              background: "var(--text)",
              color: "var(--bg2)",
              border: "none",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: 0.5,
              cursor: "pointer",
            }}
          >
            Start my room →
          </button>
        </div>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: "18px 0 14px",
          }}
        >
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--text3)",
              letterSpacing: 0.5,
            }}
          >
            or enter a code
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        {/* Join input */}
        <input
          value={joinInput}
          onChange={(e) => {
            setError("");
            setJoinInput(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 10),
            );
          }}
          onKeyDown={(e) => e.key === "Enter" && onJoin()}
          placeholder="Enter room code — e.g. XK7A9BQ"
          style={{
            width: "100%",
            background: "var(--bg2)",
            border: `1.5px solid ${error ? "#ef4444" : "var(--border2)"}`,
            borderRadius: 9,
            padding: "12px 16px",
            fontSize: 14,
            fontFamily: "var(--font-mono)",
            letterSpacing: 2,
            color: "var(--text)",
            outline: "none",
            marginBottom: 8,
          }}
        />
        {error && (
          <div
            style={{
              color: "#ef4444",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              marginBottom: 8,
            }}
          >
            ✗ {error}
          </div>
        )}
        <button
          onClick={onJoin}
          style={{
            width: "100%",
            padding: "12px 0",
            background: "transparent",
            color: "var(--text)",
            border: "1.5px solid var(--border2)",
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Join room
        </button>

        {/* Privacy note */}
        <div
          style={{
            marginTop: 20,
            padding: "14px 16px",
            background: "var(--amber-bg)",
            border: "1px solid #fde68a",
            borderRadius: 10,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "var(--amber)",
              fontWeight: 500,
              marginBottom: 4,
            }}
          >
            Your chat belongs only to you
          </div>
          <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.65 }}>
            No one else can see your messages — not us, not anyone. Only the two
            people in this room, and only while both are connected.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "center",
            gap: 16,
          }}
        >
          {["No accounts", "No logs", "No history"].map((t, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--text3)",
              }}
            >
              {i > 0 && (
                <span style={{ marginRight: 16, color: "var(--border2)" }}>
                  ·
                </span>
              )}
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Chat Screen ───────────────────────────────────────────
function ChatScreen({
  roomCode,
  messages,
  input,
  isTyping,
  onlineCount,
  onInputChange,
  onSend,
  onLeave,
  bottomRef,
  saved,
  onSave,
  onClearSave,
}) {
  const connected = onlineCount >= 2;
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft());

  // Countdown timer — ticks every second when saved
  useEffect(() => {
    if (!saved) {
      setTimeLeft(null);
      return;
    }
    const id = setInterval(() => {
      const t = getTimeLeft();
      setTimeLeft(t);
      if (!t) {
        // Time expired — auto clear
        clearMessages();
        onClearSave();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [saved]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        maxWidth: 560,
        margin: "0 auto",
        background: "var(--bg)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {/* Left — room code + status */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: 4,
                    color: "var(--text)",
                  }}
                >
                  {roomCode}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text3)",
                    marginTop: 1,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Private room
                </div>
              </div>
              <CopyButton text={roomCode} />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: connected ? "var(--green-bg)" : "var(--bg3)",
              border: `1px solid ${connected ? "var(--green-bdr)" : "var(--border)"}`,
              borderRadius: 20,
              padding: "5px 5px",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: connected ? "var(--green)" : "var(--text3)",
                animation: connected
                  ? "pulse 2s infinite"
                  : "shimmer 1.8s infinite",
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: connected ? "var(--green)" : "var(--text3)",
              }}
            >
              {connected ? `${onlineCount} online` : "waiting..."}
            </span>
          </div>
        </div>

        {/* Right — save button + leave */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Save / Saved toggle */}
          {!saved ? (
            <button
              onClick={onSave}
              title="Save this chat for 1 hour"
              style={{
                fontSize: 11,
                padding: "5px 5px",
                borderRadius: 6,
                border: "1px solid var(--green-bdr)",
                background: "var(--green-bg)",
                color: "var(--green)",
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Save for 1hr
            </button>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 2,
              }}
            >
              <button
                onClick={onClearSave}
                title="Click to clear saved chat"
                style={{
                  fontSize: 11,
                  padding: "5px 5px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--bg3)",
                  color: "var(--text2)",
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                ✓ Saved · Clear
              </button>
              {timeLeft && (
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text3)",
                    paddingRight: 2,
                  }}
                >
                  clears in {timeLeft}
                </span>
              )}
            </div>
          )}

          {/* Leave */}
          <button
            onClick={onLeave}
            style={{
              fontSize: 11,
              padding: "5px 8px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text2)",
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
            }}
          >
            Leave
          </button>
        </div>
      </div>

      {/* Saved notice banner */}
      {saved && (
        <div
          style={{
            padding: "8px 18px",
            background: "var(--green-bg)",
            borderBottom: "1px solid var(--green-bdr)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M1.5 6L4.5 9L10.5 3"
              stroke="#16a34a"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontSize: 12, color: "var(--green)" }}>
            Chat saved locally — only visible on this device.
            {timeLeft && ` Clears in ${timeLeft}.`}
          </span>
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "18px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--text3)",
              background: "var(--bg3)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: "3px 10px",
            }}
          >
            {connected
              ? "Session started · messages vanish on refresh unless saved"
              : `Share code ${roomCode} to invite someone`}
          </span>
        </div>

        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              marginTop: 40,
              animation: "fadeUp .4s ease both",
            }}
          >
            <div style={{ fontSize: 14, color: "var(--text2)" }}>
              {connected
                ? 'Say something. Hit "Save for 1hr" to keep it after refresh.'
                : "Waiting for the other person to join..."}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.sender === "me" ? "flex-end" : "flex-start",
              animation: "fadeUp .2s ease both",
            }}
          >
            <div
              style={{
                maxWidth: "72%",
                padding: "10px 15px",
                borderRadius: 16,
                borderBottomRightRadius: msg.sender === "me" ? 3 : 16,
                borderBottomLeftRadius: msg.sender === "them" ? 3 : 16,
                background:
                  msg.sender === "me" ? "var(--me-bg)" : "var(--them-bg)",
                color:
                  msg.sender === "me" ? "var(--me-text)" : "var(--them-text)",
                fontSize: 14,
                lineHeight: 1.55,
                wordBreak: "break-word",
                border:
                  msg.sender === "them" ? "1px solid var(--border)" : "none",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              animation: "fadeUp .2s ease both",
            }}
          >
            <div
              style={{
                padding: "11px 15px",
                borderRadius: 16,
                borderBottomLeftRadius: 3,
                background: "var(--them-bg)",
                border: "1px solid var(--border)",
                display: "flex",
                gap: 5,
                alignItems: "center",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--text3)",
                    animation: "bounce 1.2s ease infinite",
                    animationDelay: `${i * 0.18}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border)",
          background: "var(--bg2)",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <input
          value={input}
          onChange={onInputChange}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder={
            connected ? "Message..." : "Waiting for the other person..."
          }
          disabled={!connected}
          autoFocus
          style={{
            flex: 1,
            background: "var(--bg)",
            border: "1.5px solid var(--border2)",
            borderRadius: 24,
            padding: "11px 18px",
            fontSize: 14,
            color: "var(--text)",
            outline: "none",
            opacity: connected ? 1 : 0.5,
            cursor: connected ? "text" : "not-allowed",
          }}
        />
        <button
          onClick={onSend}
          disabled={!connected}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "none",
            background: "var(--text)",
            color: "var(--bg2)",
            fontSize: 16,
            cursor: connected ? "pointer" : "not-allowed",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: connected ? 1 : 0.4,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
