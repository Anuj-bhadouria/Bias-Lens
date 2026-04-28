import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";

// Minimal markdown renderer (no external dep needed)
function renderMarkdown(md) {
    if (!md) return [];
    return md.split("\n").map((line, i) => {
        if (line.startsWith("## ")) {
            return (
                <h2
                    key={i}
                    style={{
                        fontFamily: "Manrope, sans-serif",
                        fontWeight: 800,
                        fontSize: 16,
                        color: "#fff",
                        marginTop: 24,
                        marginBottom: 8,
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        paddingBottom: 6,
                    }}
                >
                    {line.slice(3)}
                </h2>
            );
        }
        if (line.startsWith("# ")) {
            return (
                <h1
                    key={i}
                    style={{
                        fontFamily: "Manrope, sans-serif",
                        fontWeight: 800,
                        fontSize: 20,
                        color: "#f59e0b",
                        marginBottom: 12,
                    }}
                >
                    {line.slice(2)}
                </h1>
            );
        }
        if (line.startsWith("- ")) {
            return (
                <li
                    key={i}
                    style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        color: "#aaa",
                        lineHeight: 1.7,
                        marginLeft: 16,
                        listStyleType: "disc",
                    }}
                >
                    {line.slice(2)}
                </li>
            );
        }
        if (line.match(/^\d+\./)) {
            return (
                <li
                    key={i}
                    style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        color: "#aaa",
                        lineHeight: 1.7,
                        marginLeft: 16,
                        listStyleType: "decimal",
                    }}
                >
                    {line.replace(/^\d+\.\s*/, "")}
                </li>
            );
        }
        if (line.trim() === "") return <div key={i} style={{ height: 8 }} />;
        return (
            <p
                key={i}
                style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 13,
                    color: "#aaa",
                    lineHeight: 1.7,
                    marginBottom: 4,
                }}
            >
                {line}
            </p>
        );
    });
}

export default function ComplianceReport({ caseId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch(`http://localhost:8000/compliance/${caseId}`)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((d) => {
                setData(d);
                setLoading(false);
            })
            .catch((e) => {
                setError(e.message);
                setLoading(false);
            });
    }, [caseId]);

    if (loading) {
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "48px 0",
                    gap: 12,
                }}
            >
                <Loader2
                    size={28}
                    color="#f59e0b"
                    style={{ animation: "spin 1s linear infinite" }}
                />
                <span
                    style={{
                        fontFamily: "Space Grotesk, sans-serif",
                        fontSize: 11,
                        color: "#555",
                        textTransform: "uppercase",
                        letterSpacing: 1.5,
                    }}
                >
                    Generating compliance report…
                </span>
            </div>
        );
    }

    if (error) {
        return (
            <div
                style={{
                    background: "rgba(248,113,113,0.06)",
                    border: "1px solid rgba(248,113,113,0.2)",
                    borderRadius: 14,
                    padding: "14px 16px",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 13,
                    color: "#f87171",
                }}
            >
                Failed to load compliance report: {error}
            </div>
        );
    }

    if (!data) return null;

    const passed = data.fairrank_score >= 80;
    const Icon = passed ? ShieldCheck : ShieldAlert;
    const iconColor = passed ? "#4ade80" : data.fairrank_score >= 50 ? "#fbbf24" : "#f87171";

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginBottom: 24,
                    padding: "16px",
                    background: `${iconColor}0a`,
                    border: `1px solid ${iconColor}30`,
                    borderRadius: 14,
                }}
            >
                <Icon size={28} color={iconColor} />
                <div>
                    <div
                        style={{
                            fontFamily: "Manrope, sans-serif",
                            fontWeight: 800,
                            fontSize: 16,
                            color: "#fff",
                        }}
                    >
                        {data.case_name} — Compliance Assessment
                    </div>
                    <div
                        style={{
                            fontFamily: "Space Grotesk, sans-serif",
                            fontSize: 11,
                            color: iconColor,
                            textTransform: "uppercase",
                            letterSpacing: 1.2,
                            marginTop: 3,
                        }}
                    >
                        FairRank {data.fairrank_score}/100 — {data.fairrank_label}
                    </div>
                </div>
                <div
                    style={{
                        marginLeft: "auto",
                        fontFamily: "Space Grotesk, sans-serif",
                        fontSize: 10,
                        color: "#555",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6,
                        padding: "3px 10px",
                    }}
                >
                    EU AI Act · US EEOC
                </div>
            </div>

            {/* Report body */}
            <div style={{ lineHeight: 1.7 }}>{renderMarkdown(data.report_markdown)}</div>
        </motion.div>
    );
}
