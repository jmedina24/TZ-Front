import React, { useEffect, useMemo, useRef, useState } from "react";
import "../css/productQuestions.css";
import { useOutletContext } from "react-router-dom";

const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

const fmtDateTime = (d) => {
    if (!d) return "—";
    try {
        return new Date(d).toLocaleString("es-UY");
    } catch {
        return "—";
    }
};

function lockBodyScroll(lock) {
    const body = document.body;
    if (!body) return;
    if (lock) {
        body.dataset.prevOverflow = body.style.overflow || "";
        body.style.overflow = "hidden";
    } else {
        body.style.overflow = body.dataset.prevOverflow || "";
        delete body.dataset.prevOverflow;
    }
}

const getDisplayName = (u) => {
    if (!u) return "Usuario";

    const full =
        u?.fullName ||
        (u?.name && u?.lastName ? `${u.name} ${u.lastName}` : null) ||
        (u?.firstName && u?.lastName ? `${u.firstName} ${u.lastName}` : null) ||
        u?.name ||
        u?.username ||
        (u?.email ? String(u.email).split("@")[0] : null);

    return (full || "Usuario").trim();
};


export default function ProductQuestions({
    productId,
    // opcional si lo querés controlar desde afuera
    defaultLimit = 10,
}) {
    const outlet = useOutletContext?.() || {};
    const token = outlet.token || null;
    const showToast = outlet.showToast;

    // ===== Nueva pregunta =====
    const [qText, setQText] = useState("");
    const [sending, setSending] = useState(false);
    const textareaRef = useRef(null);

    // autoresize textarea
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    }, [qText]);

    const authHeaders = useMemo(() => {
        if (!token) return null;
        return {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        };
    }, [token]);

    // ===== Conteo total (para mostrar “Ver preguntas (N)”) =====
    const [totalQuestions, setTotalQuestions] = useState(0);

    // ===== Modal =====
    const [modalOpen, setModalOpen] = useState(false);

    // ===== Listado (paginado) =====
    const [loadingList, setLoadingList] = useState(false);
    const [listError, setListError] = useState(null);

    // Soporte server-side:
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Fallback client-side si el back devuelve array:
    const [allItemsFallback, setAllItemsFallback] = useState(null);

    const limit = defaultLimit;

    const canPrev = page > 1;
    const canNext = page < totalPages;

    // Cerrar con ESC
    useEffect(() => {
        if (!modalOpen) return;

        const onKeyDown = (e) => {
            if (e.key === "Escape") setModalOpen(false);
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [modalOpen]);

    // Lock scroll body
    useEffect(() => {
        lockBodyScroll(modalOpen);
        return () => lockBodyScroll(false);
    }, [modalOpen]);

    const toast = (msg, type = "success") => {
        if (typeof showToast === "function") showToast(msg, type);
        else console.log(`[${type}] ${msg}`);
    };

    const normalizeResponse = (data) => {
        // Server-side recomendado:
        // { items, page, totalPages, totalItems }
        if (data && Array.isArray(data.items)) {
            return {
                mode: "server",
                items: data.items,
                page: Number(data.page) || 1,
                totalPages: Number(data.totalPages) || 1,
                totalItems: Number(data.totalItems) || data.items.length || 0,
            };
        }

        // Alternativa: { questions: [...] }
        if (data && Array.isArray(data.questions)) {
            return { mode: "array", items: data.questions };
        }

        // Array directo
        if (Array.isArray(data)) {
            return { mode: "array", items: data };
        }

        // Fallback
        return { mode: "server", items: [], page: 1, totalPages: 1, totalItems: 0 };
    };

    const fetchQuestions = async ({ pageToLoad = 1, silent = false } = {}) => {
        if (!productId) return;

        if (!silent) {
            setLoadingList(true);
            setListError(null);
        }

        try {
            const res = await fetch(
                `${API_BASE_URL}${API_PREFIX}/product/${productId}/questions?page=${pageToLoad}&limit=${limit}`,
                {
                    method: "GET",
                    headers: authHeaders || undefined,
                }
            );

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                const msg = data?.msg || "No se pudieron cargar las preguntas.";
                throw new Error(msg);
            }

            const normalized = normalizeResponse(data);

            if (normalized.mode === "server") {
                setAllItemsFallback(null);
                setItems(normalized.items);
                setPage(normalized.page);
                setTotalPages(normalized.totalPages);
                setTotalQuestions(normalized.totalItems);
            } else {
                // array → paginación client-side
                const arr = normalized.items || [];
                setAllItemsFallback(arr);
                setTotalQuestions(arr.length);

                const tp = Math.max(1, Math.ceil(arr.length / limit));
                const safePage = Math.max(1, Math.min(pageToLoad, tp));
                setPage(safePage);
                setTotalPages(tp);
                setItems(arr.slice((safePage - 1) * limit, safePage * limit));
            }
        } catch (e) {
            setItems([]);
            setTotalPages(1);
            setPage(1);

            setListError(e?.message || "No se pudieron cargar las preguntas.");
            // si falla, no pisamos el contador anterior a 0 automáticamente
        } finally {
            if (!silent) setLoadingList(false);
        }
    };

    // Cargar solo contador inicial (sin abrir modal)
    useEffect(() => {
        // hacemos un fetch silencioso de la primera página para obtener total
        fetchQuestions({ pageToLoad: 1, silent: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productId, token]);

    // Cuando abre el modal, cargar página 1 (o la actual)
    useEffect(() => {
        if (!modalOpen) return;
        fetchQuestions({ pageToLoad: 1 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modalOpen]);

    const openModal = () => {
        setModalOpen(true);
    };

    const closeModal = () => setModalOpen(false);

    const goPrev = () => {
        if (!canPrev) return;
        const nextPage = page - 1;
        if (allItemsFallback) {
            setPage(nextPage);
            setItems(allItemsFallback.slice((nextPage - 1) * limit, nextPage * limit));
        } else {
            fetchQuestions({ pageToLoad: nextPage });
        }
    };

    const goNext = () => {
        if (!canNext) return;
        const nextPage = page + 1;
        if (allItemsFallback) {
            setPage(nextPage);
            setItems(allItemsFallback.slice((nextPage - 1) * limit, nextPage * limit));
        } else {
            fetchQuestions({ pageToLoad: nextPage });
        }
    };

    const submitQuestion = async (e) => {
        e?.preventDefault?.();

        if (!productId) return;

        const text = String(qText || "").trim();
        if (!text) {
            toast("Escribí tu pregunta 🙂", "warning");
            return;
        }

        if (!token) {
            toast("Iniciá sesión para hacer una pregunta", "error");
            return;
        }

        if (sending) return;
        setSending(true);

        try {
            const res = await fetch(
                `${API_BASE_URL}${API_PREFIX}/product/${productId}/questions`,
                {
                    method: "POST",
                    headers: authHeaders,
                    body: JSON.stringify({ question: text }),
                }
            );

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.msg || "No se pudo enviar tu pregunta.");

            setQText("");
            toast("✅ Pregunta enviada", "success");

            // refrescar contador + (si modal abierto) refrescar lista
            if (modalOpen) {
                await fetchQuestions({ pageToLoad: 1 });
            } else {
                await fetchQuestions({ pageToLoad: 1, silent: true });
            }
        } catch (err) {
            toast(err?.message || "Error enviando pregunta", "error");
        } finally {
            setSending(false);
        }
    };

    return (
        <section className="pqSection" aria-label="Preguntas del producto">
            <div className="pqDivider" />

            <div className="pqHead">
                <h3 className="pqTitle">Preguntas</h3>

                {totalQuestions > 0 && (
                    <button type="button" className="pqLink" onClick={openModal}>
                        Ver preguntas realizadas ({totalQuestions})
                        <i className="bi bi-chevron-right" />
                    </button>
                )}
            </div>

            <form className="pqForm" onSubmit={submitQuestion}>
                <div className="pqLabel">Nueva pregunta</div>

                <textarea
                    ref={textareaRef}
                    className="pqInput"
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    placeholder="Escriba aquí su consulta..."
                    rows={2}
                />

                <div className="pqActions">
                    <button
                        type="submit"
                        className="pqBtn pqBtn--primary"
                        disabled={sending || !token}
                        title={!token ? "Iniciá sesión para preguntar" : undefined}
                    >
                        {sending ? "Enviando..." : "Enviar pregunta"}
                    </button>
                </div>

                {!token && (
                    <p className="pqHint">
                        Iniciá sesión para poder enviar preguntas.
                    </p>
                )}
            </form>

            {/* ===== MODAL ===== */}
            {modalOpen && (
                <div className="pqModalOverlay" onClick={closeModal} role="dialog" aria-modal="true">
                    <div className="pqModal" onClick={(e) => e.stopPropagation()}>
                        <div className="pqModalHead">
                            <div className="pqModalTitle">
                                Preguntas realizadas{" "}
                                <span className="pqModalCount">{totalQuestions}</span>
                            </div>

                            <button className="pqModalClose" type="button" onClick={closeModal} aria-label="Cerrar">
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>

                        <div className="pqModalBody">
                            {loadingList ? (
                                <div className="pqSkel">
                                    <div className="pqSkel__row" />
                                    <div className="pqSkel__row" />
                                    <div className="pqSkel__row" />
                                </div>
                            ) : listError ? (
                                <div className="pqError">
                                    <i className="bi bi-exclamation-triangle" />
                                    <div>
                                        <div className="pqError__title">No se pudieron cargar</div>
                                        <div className="pqError__text">{listError}</div>
                                    </div>
                                </div>
                            ) : items.length === 0 ? (
                                <div className="pqEmpty">
                                    Todavía no hay preguntas para este producto.
                                </div>
                            ) : (
                                <div className="pqList">
                                    {items.map((q) => {
                                        const asker = q?.userId || q?.askedBy || q?.user || q?.author;

                                        const admin = q?.answeredBy || q?.admin;

                                        const qText = q?.text || q?.question || "";
                                        const qAt = q?.createdAt || q?.askedAt || q?.askDate;

                                        const answerText =
                                            (typeof q?.answer === "string" ? q.answer : q?.answer?.text) ||
                                            q?.answerText ||
                                            q?.response ||
                                            "";

                                        const aAt =
                                            q?.answeredAt ||
                                            q?.answer?.createdAt ||
                                            q?.answerDate ||
                                            q?.updatedAt; // opcional fallback


                                        const hasAnswer = Boolean(answerText);

                                        return (
                                            <div key={q?._id || `${qText}-${qAt}`} className="pqItem">
                                                <div className="pqQ">
                                                    <div className="pqQ__meta">
                                                        <span className="pqQ__who">{getDisplayName(asker)}</span>
                                                        <span className="pqQ__sep">•</span>
                                                        <span className="pqQ__when">{fmtDateTime(qAt)}</span>
                                                    </div>

                                                    <div className="pqQ__text">{qText}</div>
                                                </div>

                                                <div className={`pqA ${hasAnswer ? "" : "pqA--pending"}`}>
                                                    {hasAnswer ? (
                                                        <>
                                                            <div className="pqA__meta">
                                                                <span className="pqA__who">
                                                                    {admin ? `Admin: ${getDisplayName(admin)}` : "Admin"}
                                                                </span>
                                                                <span className="pqA__sep">•</span>
                                                                <span className="pqA__when">{fmtDateTime(aAt)}</span>
                                                            </div>
                                                            <div className="pqA__text">{answerText}</div>
                                                        </>
                                                    ) : (
                                                        <div className="pqA__pending">
                                                            <i className="bi bi-hourglass-split" />
                                                            Pendiente de respuesta
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer paginación */}
                        <div className="pqPagination">
                            <button
                                className="pqPageBtn"
                                onClick={goPrev}
                                disabled={!canPrev || loadingList}
                                aria-label="Página anterior"
                            >
                                <i className="bi bi-chevron-left" />
                            </button>

                            {Array.from({ length: totalPages }).map((_, i) => {
                                const p = i + 1;

                                // opcional: limitar cantidad visible si hay muchas páginas
                                if (
                                    totalPages > 7 &&
                                    p !== 1 &&
                                    p !== totalPages &&
                                    Math.abs(p - page) > 1
                                ) {
                                    if (p === 2 || p === totalPages - 1) {
                                        return (
                                            <span key={`dots-${p}`} className="pqPageDots">
                                                …
                                            </span>
                                        );
                                    }
                                    return null;
                                }

                                return (
                                    <button
                                        key={p}
                                        className={`pqPageBtn ${p === page ? "pqPageBtn--active" : ""}`}
                                        onClick={() => {
                                            if (allItemsFallback) {
                                                setPage(p);
                                                setItems(
                                                    allItemsFallback.slice(
                                                        (p - 1) * limit,
                                                        p * limit
                                                    )
                                                );
                                            } else {
                                                fetchQuestions({ pageToLoad: p });
                                            }
                                        }}
                                    >
                                        {p}
                                    </button>
                                );
                            })}

                            <button
                                className="pqPageBtn"
                                onClick={goNext}
                                disabled={!canNext || loadingList}
                                aria-label="Página siguiente"
                            >
                                <i className="bi bi-chevron-right" />
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </section>
    );
}
