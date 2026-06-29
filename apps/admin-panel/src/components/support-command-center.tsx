"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import {
  Search,
  Send,
  Paperclip,
  Smile,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  MoreVertical,
  AlertCircle,
  CheckCheck,
  Volume2,
  Lock,
  Plus,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  User,
  Clock,
  ClipboardList,
  ShieldAlert,
  RefreshCw,
  FileDown,
  Maximize2,
  Minimize2,
  UserPlus,
  Folder,
  Download,
  ExternalLink,
  Inbox,
  Filter,
  ArrowLeft,
  UserCheck
} from "lucide-react";

import type {
  SupportTicket,
  BugReport,
  AccountChangeRequest,
  MeResponse,
  SupportStats,
  SupportMessage,
  SupportStatus,
  SupportPriority
} from "../types/admin";

import {
  replyToSupportTicket,
  addSupportTicketMessage,
  updateBugReport,
  addBugReportMessage,
  approveAccountChangeRequest,
  rejectAccountChangeRequest,
  addChangeRequestMessage
} from "../lib/api";

import { useAdminStore } from "../store/admin-store";

function normalizedAvatarGender(gender?: string) {
  const value = gender?.trim().toLowerCase();
  if (!value) return undefined;
  if (["male", "man", "men", "boy"].includes(value)) return "boy";
  if (["female", "woman", "women", "girl"].includes(value)) return "girl";
  return undefined;
}

function getDefaultAvatarUrl(seed: string, gender?: string) {
  const selectedGender = normalizedAvatarGender(gender);
  const avatarGender = selectedGender ?? (Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2 === 0 ? "boy" : "girl");
  return `https://avatar.iran.liara.run/public/${avatarGender}?username=${encodeURIComponent(seed || "User")}`;
}

interface SupportCommandCenterProps {
  tickets: SupportTicket[];
  bugReports: BugReport[];
  changeRequests: AccountChangeRequest[];
  me: MeResponse;
  supportStats?: SupportStats;
  onRefresh: () => void;
  onExit?: () => void;
}

// Canned responses definitions
const CANNED_RESPONSES = [
  { trigger: "/greet", text: "Hello! Thank you for contacting Darji Support. How can I help you today?" },
  { trigger: "/resolve", text: "We have resolved your issue. Please let us know if you need anything else." },
  { trigger: "/delay", text: "We apologize for the delay. We are looking into this and will get back to you shortly." },
  { trigger: "/vehicle", text: "Please upload clear images of your RC and Driving License for verification." },
  { trigger: "/bank", text: "Please upload a clear photo of your passbook or a cancelled cheque showing bank details." },
  { trigger: "/offline", text: "Darji Support is currently offline. We will review your message first thing in the morning." }
];

export default function SupportCommandCenter({
  tickets,
  bugReports,
  changeRequests,
  me,
  supportStats,
  onRefresh,
  onExit
}: SupportCommandCenterProps) {
  const queryClient = useQueryClient();
  const token = useAdminStore((s) => s.token);
  const supportSubTab = useAdminStore((s) => s.supportSubTab);
  const setSupportSubTab = useAdminStore((s) => s.setSupportSubTab);

  // Full-screen toggle state
  const [isFullScreen, setIsFullScreen] = useState(false);

  // View state
  // We can view a ticket, bug, or request
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"ticket" | "bug" | "request" | null>(null);

  // Sidebar sub-categories
  // Customer: chats
  // Tailor: chats, shop_changes, payment_changes
  // Delivery: chats, vehicle_changes, payment_changes
  // Bugs: bug_reports
  const [activeFilterTab, setActiveFilterTab] = useState<string>("chats");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  // Chat Composer State
  const [messageText, setMessageText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [attachment, setAttachment] = useState<{
    name: string;
    size: number;
    type: string;
    url: string;
  } | null>(null);

  // Socket state
  const socketRef = useRef<Socket | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [viewersMap, setViewersMap] = useState<Record<string, { adminId: string; adminName: string }>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, { senderName: string; isTyping: boolean }>>({});
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Lightbox modal state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Canned responses dropdown
  const [showCanned, setShowCanned] = useState(false);
  const [cannedSearch, setCannedSearch] = useState("");
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Sound notifications helper
  const playNotificationSound = () => {
    const audio = new Audio("/ding.mp3");
    audio.play().catch((e) => console.log("Audio play blocked", e));
  };

  // Connect Socket.IO
  useEffect(() => {
    if (!token) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://backend-production-5a7e4.up.railway.app/api";
    const SOCKET_URL = API_URL.replace(/\/api$/, "");

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Support CommandCenter Socket Connected");
    });

    socket.on("user:online_list", (userIds: string[]) => {
      setOnlineUserIds(userIds);
    });

    socket.on("user:status_changed", (data: { userId: string; online: boolean }) => {
      setOnlineUserIds((prev) => {
        if (data.online) {
          return prev.includes(data.userId) ? prev : [...prev, data.userId];
        } else {
          return prev.filter((id) => id !== data.userId);
        }
      });
    });

    socket.on("support:active_viewers", (viewers: Array<{ key: string; adminId: string; adminName: string }>) => {
      const vMap: Record<string, { adminId: string; adminName: string }> = {};
      viewers.forEach((v) => {
        vMap[v.key] = { adminId: v.adminId, adminName: v.adminName };
      });
      setViewersMap(vMap);
    });

    socket.on(
      "support:viewer_changed",
      (data: { type: string; id: string; adminId: string; adminName?: string; isViewing: boolean }) => {
        const viewKey = `${data.type}:${data.id}`;
        setViewersMap((prev) => {
          const next = { ...prev };
          if (data.isViewing && data.adminName) {
            next[viewKey] = { adminId: data.adminId, adminName: data.adminName };
          } else {
            if (next[viewKey]?.adminId === data.adminId) {
              delete next[viewKey];
            }
          }
          return next;
        });
      }
    );

    socket.on("typing:status", (data: { type: string; id: string; senderId: string; senderName: string; isTyping: boolean }) => {
      const typeKey = `${data.type}:${data.id}`;
      if (data.senderId !== me.id) {
        setTypingUsers((prev) => ({
          ...prev,
          [typeKey]: { senderName: data.senderName, isTyping: data.isTyping }
        }));
      }
    });

    socket.on("support:read_receipt", (data: { type: string; id: string }) => {
      onRefresh();
    });

    // Sound alert + sync triggers on updates
    const handleUpdate = (type: "ticket" | "bug" | "request", payload: any) => {
      onRefresh();
      
      // Determine if a new client message was added
      const incomingMessages = payload.messages || [];
      if (incomingMessages.length > 0) {
        const lastMsg = incomingMessages[incomingMessages.length - 1];
        // If not sent by an admin or system, and not internal, play sound
        if (lastMsg.sender === "client") {
          playNotificationSound();
          toast.info(`New message from ${lastMsg.senderName || "User"}`);
        }
      }
    };

    socket.on("support:ticket_updated", (data) => handleUpdate("ticket", data));
    socket.on("support:bug_updated", (data) => handleUpdate("bug", data));
    socket.on("support:change_request_updated", (data) => handleUpdate("request", data));

    return () => {
      socket.disconnect();
    };
  }, [token, me.id]);

  // Handle viewing change & marking as read
  useEffect(() => {
    if (!socketRef.current) return;

    // Report active viewing state to other admins
    socketRef.current.emit("support:viewing", { type: activeType, id: activeId });

    // Mark read
    if (activeId && activeType) {
      let recipientId = "";
      if (activeType === "ticket") {
        const t = tickets.find((x) => x.id === activeId);
        if (t) recipientId = t.userId;
      } else if (activeType === "bug") {
        const b = bugReports.find((x) => x.id === activeId);
        if (b) recipientId = b.userId;
      } else if (activeType === "request") {
        const r = changeRequests.find((x) => x.id === activeId);
        if (r) recipientId = r.userId;
      }

      if (recipientId) {
        socketRef.current.emit("support:mark_read", {
          type: activeType,
          id: activeId,
          recipientId
        });
      }
    }
  }, [activeId, activeType, tickets, bugReports, changeRequests]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, tickets, bugReports, changeRequests]);

  // Find active items
  const activeTicket = useMemo(() => {
    if (activeType !== "ticket") return null;
    return tickets.find((t) => t.id === activeId) || null;
  }, [tickets, activeId, activeType]);

  const activeBug = useMemo(() => {
    if (activeType !== "bug") return null;
    return bugReports.find((b) => b.id === activeId) || null;
  }, [bugReports, activeId, activeType]);

  const activeRequest = useMemo(() => {
    if (activeType !== "request") return null;
    return changeRequests.find((r) => r.id === activeId) || null;
  }, [changeRequests, activeId, activeType]);

  // List filtering logic
  const filteredList = useMemo(() => {
    // 1. Filter by Main Support stream (Customer, Tailor, Delivery, Bugs)
    // 2. Filter by sub-tab inside the stream
    // 3. Search and status filters
    const searchLower = searchQuery.toLowerCase();

    if (supportSubTab === "customer") {
      // Customer stream has only "chats"
      return tickets
        .filter((t) => {
          const isCustomer = t.user?.role === "CUSTOMER" || t.category === "Customer" || (!t.user?.role && t.subject.toLowerCase().includes("customer"));
          if (!isCustomer) return false;

          // Status & priority
          if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
          if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;

          // Search
          return (
            t.subject.toLowerCase().includes(searchLower) ||
            t.user?.name?.toLowerCase().includes(searchLower) ||
            t.user?.phone.includes(searchLower)
          );
        })
        .map((t) => ({ type: "ticket" as const, id: t.id, data: t }));
    }

    if (supportSubTab === "tailor") {
      if (activeFilterTab === "chats") {
        return tickets
          .filter((t) => {
            const isTailor = t.user?.role === "TAILOR" || t.category === "Tailor" || t.subject.toLowerCase().includes("tailor");
            if (!isTailor) return false;

            if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
            if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;

            return (
              t.subject.toLowerCase().includes(searchLower) ||
              t.user?.name?.toLowerCase().includes(searchLower) ||
              t.user?.phone.includes(searchLower)
            );
          })
          .map((t) => ({ type: "ticket" as const, id: t.id, data: t }));
      } else if (activeFilterTab === "shop_changes") {
        return changeRequests
          .filter((r) => {
            const isTailor = r.userRole === "TAILOR" || r.user?.role === "TAILOR";
            if (!isTailor || r.type !== "ShopName") return false;

            if (statusFilter !== "ALL" && r.status !== statusFilter) return false;

            return (
              r.user?.name?.toLowerCase().includes(searchLower) ||
              r.user?.phone.includes(searchLower)
            );
          })
          .map((r) => ({ type: "request" as const, id: r.id, data: r }));
      } else if (activeFilterTab === "payment_changes") {
        return changeRequests
          .filter((r) => {
            const isTailor = r.userRole === "TAILOR" || r.user?.role === "TAILOR";
            if (!isTailor || !["BankAccount", "UPI"].includes(r.type)) return false;

            if (statusFilter !== "ALL" && r.status !== statusFilter) return false;

            return (
              r.user?.name?.toLowerCase().includes(searchLower) ||
              r.user?.phone.includes(searchLower)
            );
          })
          .map((r) => ({ type: "request" as const, id: r.id, data: r }));
      }
    }

    if (supportSubTab === "delivery") {
      if (activeFilterTab === "chats") {
        return tickets
          .filter((t) => {
            const isDelivery = t.user?.role === "DELIVERY_PARTNER" || t.category === "Delivery" || t.subject.toLowerCase().includes("delivery");
            if (!isDelivery) return false;

            if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
            if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;

            return (
              t.subject.toLowerCase().includes(searchLower) ||
              t.user?.name?.toLowerCase().includes(searchLower) ||
              t.user?.phone.includes(searchLower)
            );
          })
          .map((t) => ({ type: "ticket" as const, id: t.id, data: t }));
      } else if (activeFilterTab === "vehicle_changes") {
        return changeRequests
          .filter((r) => {
            const isDelivery = r.userRole === "DELIVERY_PARTNER" || r.user?.role === "DELIVERY_PARTNER";
            if (!isDelivery || !["Vehicle", "RC", "DrivingLicense"].includes(r.type)) return false;

            if (statusFilter !== "ALL" && r.status !== statusFilter) return false;

            return (
              r.user?.name?.toLowerCase().includes(searchLower) ||
              r.user?.phone.includes(searchLower)
            );
          })
          .map((r) => ({ type: "request" as const, id: r.id, data: r }));
      } else if (activeFilterTab === "payment_changes") {
        return changeRequests
          .filter((r) => {
            const isDelivery = r.userRole === "DELIVERY_PARTNER" || r.user?.role === "DELIVERY_PARTNER";
            if (!isDelivery || !["BankAccount", "UPI"].includes(r.type)) return false;

            if (statusFilter !== "ALL" && r.status !== statusFilter) return false;

            return (
              r.user?.name?.toLowerCase().includes(searchLower) ||
              r.user?.phone.includes(searchLower)
            );
          })
          .map((r) => ({ type: "request" as const, id: r.id, data: r }));
      }
    }

    if (supportSubTab === "bugs") {
      return bugReports
        .filter((b) => {
          if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
          if (priorityFilter !== "ALL" && b.priority !== priorityFilter) return false;

          return (
            b.title.toLowerCase().includes(searchLower) ||
            b.description.toLowerCase().includes(searchLower) ||
            b.user?.name?.toLowerCase().includes(searchLower) ||
            b.user?.phone.includes(searchLower)
          );
        })
        .map((b) => ({ type: "bug" as const, id: b.id, data: b }));
    }

    return [];
  }, [supportSubTab, activeFilterTab, tickets, changeRequests, bugReports, searchQuery, statusFilter, priorityFilter]);

  // Compute Unread Counts
  const counts = useMemo(() => {
    const ticketUnread = (t: SupportTicket) => t.messages?.filter((m) => m.sender === "client" && !m.read).length || 0;
    const bugUnread = (b: BugReport) => b.messages?.filter((m) => m.sender === "client" && !m.read).length || 0;
    const reqUnread = (r: AccountChangeRequest) => r.messages?.filter((m) => m.sender === "client" && !m.read).length || 0;

    let customerChats = 0;
    let tailorChats = 0;
    let tailorShop = 0;
    let tailorPayment = 0;
    let deliveryChats = 0;
    let deliveryVehicle = 0;
    let deliveryPayment = 0;
    let bugReportsCount = 0;

    tickets.forEach((t) => {
      const count = ticketUnread(t);
      if (t.user?.role === "CUSTOMER" || t.category === "Customer" || (!t.user?.role && t.subject.toLowerCase().includes("customer"))) {
        customerChats += count;
      } else if (t.user?.role === "TAILOR" || t.category === "Tailor" || t.subject.toLowerCase().includes("tailor")) {
        tailorChats += count;
      } else if (t.user?.role === "DELIVERY_PARTNER" || t.category === "Delivery" || t.subject.toLowerCase().includes("delivery")) {
        deliveryChats += count;
      }
    });

    changeRequests.forEach((r) => {
      const count = reqUnread(r);
      const isTailor = r.userRole === "TAILOR" || r.user?.role === "TAILOR";
      const isDelivery = r.userRole === "DELIVERY_PARTNER" || r.user?.role === "DELIVERY_PARTNER";

      if (isTailor) {
        if (r.type === "ShopName") tailorShop += count;
        else if (["BankAccount", "UPI"].includes(r.type)) tailorPayment += count;
      } else if (isDelivery) {
        if (["Vehicle", "RC", "DrivingLicense"].includes(r.type)) deliveryVehicle += count;
        else if (["BankAccount", "UPI"].includes(r.type)) deliveryPayment += count;
      }
    });

    bugReports.forEach((b) => {
      bugReportsCount += bugUnread(b);
    });

    return {
      customer: { chats: customerChats },
      tailor: { chats: tailorChats, shop: tailorShop, payment: tailorPayment },
      delivery: { chats: deliveryChats, vehicle: deliveryVehicle, payment: deliveryPayment },
      bugs: bugReportsCount
    };
  }, [tickets, changeRequests, bugReports]);

  // Canned Responses Search Filter
  const filteredCanned = useMemo(() => {
    if (!cannedSearch) return CANNED_RESPONSES;
    return CANNED_RESPONSES.filter(
      (c) => c.trigger.toLowerCase().includes(cannedSearch.toLowerCase()) || c.text.toLowerCase().includes(cannedSearch.toLowerCase())
    );
  }, [cannedSearch]);

  // File attach reader
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size cannot exceed 25MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        size: file.size,
        type: file.type,
        url: reader.result as string
      });
      toast.success("Attachment loaded successfully!");
    };
    reader.readAsDataURL(file);
  };

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!activeId || !activeType) return;
      if (!messageText.trim() && !attachment) return;

      const payload = {
        text: messageText,
        isInternal,
        type: attachment ? (attachment.type.startsWith("image/") ? "image" : attachment.type.startsWith("video/") ? "video" : attachment.type.startsWith("audio/") ? "audio" : "document") : "text",
        attachmentUrl: attachment?.url,
        attachmentName: attachment?.name,
        attachmentSize: attachment?.size,
        thumbnail: attachment?.type.startsWith("image/") ? attachment?.url : undefined
      };

      if (activeType === "ticket") {
        return addSupportTicketMessage({ ticketId: activeId, ...payload });
      } else if (activeType === "bug") {
        return addBugReportMessage({ bugId: activeId, ...payload });
      } else if (activeType === "request") {
        return addChangeRequestMessage({ requestId: activeId, ...payload });
      }
    },
    onSuccess: () => {
      setMessageText("");
      setAttachment(null);
      onRefresh();
      // Reset typing local status
      if (socketRef.current) {
        socketRef.current.emit("typing:status", {
          type: activeType,
          id: activeId,
          recipientId: activeTicket?.userId || activeBug?.userId || activeRequest?.userId || "user",
          isTyping: false
        });
      }
      setIsTypingLocal(false);
    },
    onError: (err) => {
      toast.error(`Failed to send message: ${err.message}`);
    }
  });
 
  const initiateBugChat = async () => {
    if (!activeId) return;
    try {
      await addBugReportMessage({
        bugId: activeId,
        text: "Thank you for submitting the bug. We want to talk if we can.",
        type: "text",
        isInternal: false
      });
      onRefresh();
      toast.success("Bug report chat initiated!");
    } catch (e: any) {
      toast.error(`Failed to initiate chat: ${e.message || e}`);
    }
  };

  // Handle composer typing to broadcast typing event
  const handleComposerChange = (val: string) => {
    setMessageText(val);

    // Canned shortcut detector
    if (val.endsWith("/")) {
      setShowCanned(true);
      setCannedSearch("");
    } else if (showCanned) {
      const idx = val.lastIndexOf("/");
      if (idx !== -1) {
        setCannedSearch(val.slice(idx + 1));
      } else {
        setShowCanned(false);
      }
    }

    // Typing socket event trigger
    if (socketRef.current && activeId && activeType) {
      const recipientId = activeTicket?.userId || activeBug?.userId || activeRequest?.userId || "user";
      if (!isTypingLocal) {
        setIsTypingLocal(true);
        socketRef.current.emit("typing:status", {
          type: activeType,
          id: activeId,
          recipientId,
          isTyping: true
        });
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTypingLocal(false);
        socketRef.current!.emit("typing:status", {
          type: activeType,
          id: activeId,
          recipientId,
          isTyping: false
        });
      }, 3000);
    }
  };

  // Insert canned response
  const handleSelectCanned = (text: string) => {
    const idx = messageText.lastIndexOf("/");
    const newVal = idx !== -1 ? messageText.slice(0, idx) + text : text;
    setMessageText(newVal);
    setShowCanned(false);
    composerInputRef.current?.focus();
  };

  // Status updates
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      if (!activeId || !activeType) return;
      if (activeType === "ticket") {
        return replyToSupportTicket({ ticketId: activeId, status });
      } else if (activeType === "bug") {
        return updateBugReport({ bugId: activeId, status });
      }
    },
    onSuccess: () => {
      onRefresh();
      toast.success("Status updated successfully.");
    },
    onError: (err) => {
      toast.error(`Failed to update status: ${err.message}`);
    }
  });

  // Priority updates
  const updatePriorityMutation = useMutation({
    mutationFn: async ({ priority }: { priority: string }) => {
      if (!activeId || !activeType) return;
      if (activeType === "ticket") {
        return replyToSupportTicket({ ticketId: activeId, priority });
      }
    },
    onSuccess: () => {
      onRefresh();
      toast.success("Priority updated successfully.");
    },
    onError: (err) => {
      toast.error(`Failed to update priority: ${err.message}`);
    }
  });

  // Assign agent / Claim ownership
  const assignAgentMutation = useMutation({
    mutationFn: async ({ agentId }: { agentId: string | null }) => {
      if (!activeId || !activeType) return;
      if (activeType === "ticket") {
        return replyToSupportTicket({ ticketId: activeId, assignedTo: agentId });
      } else if (activeType === "bug") {
        return updateBugReport({ bugId: activeId, assignedTo: agentId });
      }
    },
    onSuccess: () => {
      onRefresh();
      toast.success("Assignment updated.");
    },
    onError: (err) => {
      toast.error(`Failed to assign conversation: ${err.message}`);
    }
  });

  // Approval requests processing
  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return approveAccountChangeRequest({ requestId });
    },
    onSuccess: () => {
      onRefresh();
      toast.success("Change request approved!");
    },
    onError: (err) => {
      toast.error(`Failed to approve: ${err.message}`);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes: string }) => {
      return rejectAccountChangeRequest({ requestId, adminNotes: notes });
    },
    onSuccess: () => {
      onRefresh();
      toast.success("Change request rejected.");
    },
    onError: (err) => {
      toast.error(`Failed to reject: ${err.message}`);
    }
  });

  // Active chat context details helpers
  const currentChatUser = activeTicket?.user || activeBug?.user || activeRequest?.user || null;
  const isUserOnline = currentChatUser ? onlineUserIds.includes(currentChatUser.id) : false;

  // Active viewer in this conversation
  const viewerKey = `${activeType}:${activeId}`;
  const otherViewer = viewersMap[viewerKey];

  return (
    <div className={`darji-support-shell flex w-full gap-4 overflow-hidden text-[var(--foreground)] ${
      (onExit != null || isFullScreen)
        ? "fixed inset-0 z-[9999] p-3 bg-[var(--background)] animate-slide-up-fade"
        : "h-[calc(100vh-170px)] animate-slide-up-fade"
    }`}>
      
      {/* COLUMN 1: Category Sidebar (240px) */}
      <div className="w-[240px] flex shrink-0 flex-col gap-3 rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel)] p-4 shadow-xl">
        <div className="px-1 py-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--muted)]">Command Center</p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight">Support Streams</h3>
        </div>

        {onExit && (
          <button
            onClick={onExit}
            className="w-full flex items-center gap-2 mb-1 px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--foreground)] transition bg-[var(--panel-strong)] border border-[var(--panel-border)] hover:border-[var(--accent)] rounded-[18px]"
          >
            <ArrowLeft size={14} />
            Exit Command Center
          </button>
        )}

        <nav className="flex flex-col gap-1 mt-2 flex-1 overflow-y-auto">
          {/* Customer Stream */}
          <div className="mb-4">
            <p className="px-3 mb-1 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Customer Support</p>
            <button
              onClick={() => {
                setSupportSubTab("customer");
                setActiveFilterTab("chats");
                setActiveId(null);
              }}
              className={`w-full flex items-center justify-between rounded-[18px] border px-4 py-3 text-left transition ${
                supportSubTab === "customer"
                  ? "border-[var(--accent)] bg-[var(--accent-cream)] text-[var(--foreground)]"
                  : "border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className="flex items-center gap-2 font-medium text-sm">
                <Inbox size={16} />
                Chats
              </span>
              {counts.customer.chats > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-[var(--accent)] rounded-full text-white">
                  {counts.customer.chats}
                </span>
              )}
            </button>
          </div>

          {/* Tailor Stream */}
          <div className="mb-4">
            <p className="px-3 mb-1 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Tailor Support</p>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => {
                  setSupportSubTab("tailor");
                  setActiveFilterTab("chats");
                  setActiveId(null);
                }}
                className={`w-full flex items-center justify-between rounded-[18px] border px-4 py-2.5 text-left transition ${
                  supportSubTab === "tailor" && activeFilterTab === "chats"
                    ? "border-[var(--accent)] bg-[var(--accent-cream)] text-[var(--foreground)]"
                    : "border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
                }`}
              >
                <span className="flex items-center gap-2 font-medium text-sm">
                  <Inbox size={15} />
                  Chats
                </span>
                {counts.tailor.chats > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-[var(--accent)] rounded-full text-white">
                    {counts.tailor.chats}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setSupportSubTab("tailor");
                  setActiveFilterTab("shop_changes");
                  setActiveId(null);
                }}
                className={`w-full flex items-center justify-between rounded-[18px] border px-4 py-2.5 text-left transition ${
                  supportSubTab === "tailor" && activeFilterTab === "shop_changes"
                    ? "border-[var(--accent)] bg-[var(--accent-cream)] text-[var(--foreground)]"
                    : "border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
                }`}
              >
                <span className="flex items-center gap-2 font-medium text-sm">
                  <Folder size={15} />
                  Shop Name Changes
                </span>
                {counts.tailor.shop > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-[var(--accent)] rounded-full text-white">
                    {counts.tailor.shop}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setSupportSubTab("tailor");
                  setActiveFilterTab("payment_changes");
                  setActiveId(null);
                }}
                className={`w-full flex items-center justify-between rounded-[18px] border px-4 py-2.5 text-left transition ${
                  supportSubTab === "tailor" && activeFilterTab === "payment_changes"
                    ? "border-[var(--accent)] bg-[var(--accent-cream)] text-[var(--foreground)]"
                    : "border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
                }`}
              >
                <span className="flex items-center gap-2 font-medium text-sm">
                  <FileText size={15} />
                  Bank/UPI Changes
                </span>
                {counts.tailor.payment > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-[var(--accent)] rounded-full text-white">
                    {counts.tailor.payment}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Delivery Stream */}
          <div className="mb-4">
            <p className="px-3 mb-1 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Delivery Support</p>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => {
                  setSupportSubTab("delivery");
                  setActiveFilterTab("chats");
                  setActiveId(null);
                }}
                className={`w-full flex items-center justify-between rounded-[18px] border px-4 py-2.5 text-left transition ${
                  supportSubTab === "delivery" && activeFilterTab === "chats"
                    ? "border-[var(--accent)] bg-[var(--accent-cream)] text-[var(--foreground)]"
                    : "border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
                }`}
              >
                <span className="flex items-center gap-2 font-medium text-sm">
                  <Inbox size={15} />
                  Chats
                </span>
                {counts.delivery.chats > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-[var(--accent)] rounded-full text-white">
                    {counts.delivery.chats}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setSupportSubTab("delivery");
                  setActiveFilterTab("vehicle_changes");
                  setActiveId(null);
                }}
                className={`w-full flex items-center justify-between rounded-[18px] border px-4 py-2.5 text-left transition ${
                  supportSubTab === "delivery" && activeFilterTab === "vehicle_changes"
                    ? "border-[var(--accent)] bg-[var(--accent-cream)] text-[var(--foreground)]"
                    : "border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
                }`}
              >
                <span className="flex items-center gap-2 font-medium text-sm">
                  <Folder size={15} />
                  Vehicle Updates
                </span>
                {counts.delivery.vehicle > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-[var(--accent)] rounded-full text-white">
                    {counts.delivery.vehicle}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setSupportSubTab("delivery");
                  setActiveFilterTab("payment_changes");
                  setActiveId(null);
                }}
                className={`w-full flex items-center justify-between rounded-[18px] border px-4 py-2.5 text-left transition ${
                  supportSubTab === "delivery" && activeFilterTab === "payment_changes"
                    ? "border-[var(--accent)] bg-[var(--accent-cream)] text-[var(--foreground)]"
                    : "border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
                }`}
              >
                <span className="flex items-center gap-2 font-medium text-sm">
                  <FileText size={15} />
                  Bank/UPI Changes
                </span>
                {counts.delivery.payment > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-[var(--accent)] rounded-full text-white">
                    {counts.delivery.payment}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Bug Reports */}
          <div>
            <p className="px-3 mb-1 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Bug Reports</p>
            <button
              onClick={() => {
                setSupportSubTab("bugs");
                setActiveFilterTab("chats");
                setActiveId(null);
              }}
              className={`w-full flex items-center justify-between rounded-[18px] border px-4 py-3 text-left transition ${
                supportSubTab === "bugs"
                  ? "border-[var(--accent)] bg-[var(--accent-cream)] text-[var(--foreground)]"
                  : "border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className="flex items-center gap-2 font-medium text-sm">
                <ShieldAlert size={16} />
                Bugs
              </span>
              {counts.bugs > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-[var(--accent)] rounded-full text-white">
                  {counts.bugs}
                </span>
              )}
            </button>
          </div>
        </nav>
      </div>

      {/* COLUMN 2: Conversation List (340px) */}
      <div className="w-[340px] flex shrink-0 flex-col gap-3 rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel)] shadow-xl overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-[var(--panel-border)] flex flex-col gap-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-[var(--muted)]">
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-[16px] border border-[var(--panel-border)] bg-[var(--panel-strong)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2 text-xs">
            <div className="flex-1">
              <label className="text-[10px] text-[var(--muted)] font-bold block mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2 py-1 bg-[var(--panel-strong)] border border-[var(--panel-border)] rounded-[10px] text-[var(--foreground)] text-[11px]"
              >
                <option value="ALL">All Status</option>
                <option value="OPEN">Open</option>
                <option value="WAITING_FOR_CUSTOMER">Waiting Cust</option>
                <option value="WAITING_FOR_ADMIN">Waiting Admin</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="PENDING">Pending (Reqs)</option>
                <option value="APPROVED">Approved (Reqs)</option>
                <option value="REJECTED">Rejected (Reqs)</option>
              </select>
            </div>
            {supportSubTab !== "bugs" && activeFilterTab === "chats" && (
              <div className="flex-1">
                <label className="text-[10px] text-[var(--muted)] font-bold block mb-1">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-2 py-1 bg-[var(--panel-strong)] border border-[var(--panel-border)] rounded-[10px] text-[var(--foreground)] text-[11px]"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-[var(--muted)] text-center px-4">
              <Inbox size={32} className="mb-2 opacity-50" />
              <p className="text-xs">No active items in this tab</p>
            </div>
          ) : (
            filteredList.map((item) => {
              const isSelected = activeId === item.id && activeType === item.type;
              
              // Helper definitions for item fields
              let name = "User";
              let subtitle = "";
              let tag = "";
              let timeStr = "";
              let badgeColor = "bg-[var(--panel-border)] text-[var(--foreground)]";
              let statusLabel = "";
              let isUnread = false;

              if (item.type === "ticket") {
                const t = item.data as SupportTicket;
                name = t.user?.name || "Customer";
                subtitle = t.subject;
                timeStr = t.updatedAt ? new Date(t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                
                // Priority color
                if (t.priority === "URGENT") badgeColor = "bg-red-500 text-white animate-pulse";
                else if (t.priority === "HIGH") badgeColor = "bg-orange-500 text-white";
                else if (t.priority === "MEDIUM") badgeColor = "bg-green-500 text-white";
                else badgeColor = "bg-blue-500 text-white";

                statusLabel = t.status;
                const unreadCount = t.messages?.filter((m) => m.sender === "client" && !m.read).length || 0;
                isUnread = unreadCount > 0;
              } else if (item.type === "bug") {
                const b = item.data as BugReport;
                name = b.user?.name || "User";
                subtitle = b.title;
                timeStr = b.updatedAt ? new Date(b.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                statusLabel = b.status;
                const unreadCount = b.messages?.filter((m) => m.sender === "client" && !m.read).length || 0;
                isUnread = unreadCount > 0;
              } else if (item.type === "request") {
                const r = item.data as AccountChangeRequest;
                name = r.user?.name || "User";
                subtitle = `${r.type} Update`;
                timeStr = r.updatedAt ? new Date(r.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                statusLabel = r.status;
                const unreadCount = r.messages?.filter((m) => m.sender === "client" && !m.read).length || 0;
                isUnread = unreadCount > 0;
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveId(item.id);
                    setActiveType(item.type);
                  }}
                  className={`w-full flex flex-col gap-2 p-3 text-left rounded-[16px] border transition ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent-cream)] text-[var(--foreground)]"
                      : "border-[var(--panel-border)] bg-[var(--panel-strong)] hover:bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="font-semibold text-sm truncate flex-1 text-[var(--foreground)] pr-2 flex items-center gap-1.5">
                      {name}
                      {onlineUserIds.includes((item.data as any).userId) && (
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block shrink-0" title="Online" />
                      )}
                    </span>
                    <span className="text-[10px] text-[var(--muted)] shrink-0 font-medium">{timeStr}</span>
                  </div>

                  <p className="text-xs truncate w-full text-[var(--muted)]">{subtitle}</p>

                  <div className="flex justify-between items-center w-full mt-1">
                    <div className="flex gap-1.5 items-center">
                      <span className={`px-2 py-0.5 rounded-[8px] text-[10px] font-bold tracking-wide uppercase ${badgeColor}`}>
                        {item.type === "ticket" ? (item.data as SupportTicket).priority : item.type.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-[8px] text-[10px] font-semibold border ${
                        statusLabel === "OPEN" || statusLabel === "NEW" || statusLabel === "PENDING"
                          ? "border-amber-500/30 text-amber-500 bg-amber-500/10"
                          : statusLabel === "RESOLVED" || statusLabel === "APPROVED" || statusLabel === "FIXED"
                          ? "border-green-500/30 text-green-500 bg-green-500/10"
                          : statusLabel === "CLOSED" || statusLabel === "REJECTED"
                          ? "border-red-500/30 text-red-500 bg-red-500/10"
                          : "border-[var(--panel-border)] text-[var(--muted)]"
                      }`}>
                        {statusLabel}
                      </span>
                    </div>

                    {isUnread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* COLUMN 3: Chat Workspace Area (Flex) */}
      <div className="flex-1 flex flex-col rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel-strong)] shadow-xl overflow-hidden relative">
        {activeId ? (
          <>
            {/* Chat Area Header */}
            <div className="px-6 py-4 border-b border-[var(--panel-border)] flex justify-between items-center bg-[var(--panel)] shrink-0">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-base text-[var(--foreground)]">
                    {currentChatUser?.name || "Support Conversation"}
                  </h4>
                  {isUserOnline && (
                    <span className="px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-[10px] font-bold uppercase">
                      Online
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--muted)] max-w-[400px] truncate">
                  {activeTicket?.subject || activeBug?.title || activeRequest?.type || ""}
                </p>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-3">
                {/* Active Viewer marker */}
                {otherViewer && (
                  <span className="text-xs bg-[var(--accent-soft)] border border-[var(--accent)]/30 text-[var(--accent)] px-2 py-1 rounded-[12px] flex items-center gap-1.5 animate-pulse">
                    <User size={13} />
                    {otherViewer.adminName} is viewing
                  </span>
                )}

                {/* Status selector */}
                {(activeType === "ticket" || activeType === "bug") && (
                  <select
                    value={activeTicket?.status || activeBug?.status || ""}
                    onChange={(e) => updateStatusMutation.mutate({ status: e.target.value })}
                    className="px-3 py-1.5 bg-[var(--panel-strong)] border border-[var(--panel-border)] rounded-[12px] text-[var(--foreground)] text-xs font-semibold focus:outline-none focus:border-[var(--accent)]"
                  >
                    {activeType === "ticket" ? (
                      <>
                        <option value="OPEN">Open</option>
                        <option value="WAITING_FOR_CUSTOMER">Waiting For Customer</option>
                        <option value="WAITING_FOR_ADMIN">Waiting For Admin</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </>
                    ) : (
                      <>
                        <option value="NEW">New</option>
                        <option value="INVESTIGATING">Investigating</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="FIXED">Fixed</option>
                        <option value="CLOSED">Closed</option>
                      </>
                    )}
                  </select>
                )}

                {/* Priority Selector (Tickets only) */}
                {activeType === "ticket" && (
                  <select
                    value={activeTicket?.priority || ""}
                    onChange={(e) => updatePriorityMutation.mutate({ priority: e.target.value })}
                    className="px-3 py-1.5 bg-[var(--panel-strong)] border border-[var(--panel-border)] rounded-[12px] text-[var(--foreground)] text-xs font-semibold focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                )}

                {/* Assigned Agent dropdown */}
                {(activeType === "ticket" || activeType === "bug") && (
                  <button
                    onClick={() => {
                      const currentAssigned = activeTicket?.assignedTo || activeBug?.assignedTo;
                      if (currentAssigned === me.id) {
                        assignAgentMutation.mutate({ agentId: null });
                      } else {
                        assignAgentMutation.mutate({ agentId: me.id });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-[12px] text-xs font-semibold border flex items-center gap-1.5 transition ${
                      (activeTicket?.assignedTo === me.id || activeBug?.assignedTo === me.id)
                        ? "bg-green-500/15 border border-green-500/30 text-green-700 dark:text-green-400"
                        : "bg-[var(--panel)] border border-[var(--panel-border)] hover:border-[var(--accent)] text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <UserCheck size={14} />
                    {(activeTicket?.assignedTo === me.id || activeBug?.assignedTo === me.id) ? "Assigned to Me" : "Claim Owner"}
                  </button>
                )}

                {/* Full-screen toggle — only visible when no external exit handler */}
                {onExit == null && (
                  <button
                    onClick={() => setIsFullScreen((v) => !v)}
                    title={isFullScreen ? "Exit full screen" : "Full screen"}
                    className="p-2 rounded-[12px] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--panel)] border border-transparent hover:border-[var(--panel-border)] transition"
                  >
                    {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                )}
              </div>
            </div>

            {/* Message History Grid */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-[var(--background)]">
              {/* Show initial description for bugs/requests */}
              {activeType === "bug" && activeBug && (
                <div className="p-4 bg-[var(--panel-strong)] border border-[var(--panel-border)] rounded-[18px] text-sm text-[var(--foreground)]">
                  <p className="font-bold text-[var(--foreground)] mb-2">Bug Description:</p>
                  <p className="mb-3 whitespace-pre-wrap">{activeBug.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
                    <div><strong>Device:</strong> {activeBug.deviceInfo}</div>
                    <div><strong>App Version:</strong> {activeBug.appVersion}</div>
                  </div>
                  {activeBug.screenshot && (
                    <div className="mt-3">
                      <p className="font-bold text-[var(--foreground)] mb-1.5 text-xs">Attached Screenshot:</p>
                      <img
                        src={activeBug.screenshot}
                        alt="Screenshot"
                        className="max-w-[300px] max-h-[200px] rounded-[12px] cursor-pointer hover:opacity-85 border border-[var(--panel-border)]"
                        onClick={() => setLightboxImage(activeBug.screenshot || null)}
                      />
                    </div>
                  )}
                </div>
              )}

              {activeType === "bug" && activeBug && (!activeBug.messages || activeBug.messages.length === 0) && (
                <div className="flex flex-col items-center justify-center p-8 bg-[var(--panel-strong)] border border-[var(--panel-border)] rounded-[18px] text-center my-4">
                  <AlertCircle className="w-12 h-12 text-[var(--accent)] mb-3 opacity-80 animate-pulse" />
                  <h4 className="font-bold text-[var(--foreground)] text-base mb-1">Start Chat on Bug Report</h4>
                  <p className="text-xs text-[var(--muted)] max-w-sm mb-4">
                    Send an initial message to the customer to start investigating this bug report.
                  </p>
                  <button
                    onClick={initiateBugChat}
                    className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-strong)] text-white rounded-[12px] text-xs font-bold transition shadow-md"
                  >
                    Initiate Chat with User
                  </button>
                </div>
              )}

              {/* Render Messages */}
              {(activeTicket?.messages || activeBug?.messages || activeRequest?.messages || []).map((msg, i) => {
                const isClient = msg.sender === "client";
                const isSys = msg.sender === "system";
                const isNote = msg.sender === "internal" || msg.isInternal;

                if (isSys) {
                  return (
                    <div key={i} className="flex justify-center my-1.5 shrink-0">
                      <span className="px-3 py-1 bg-[var(--panel)] border border-[var(--panel-border)] rounded-full text-xs text-[var(--muted)] font-medium">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    className={`flex flex-col gap-1 max-w-[70%] ${
                      isClient ? "self-start" : "self-end"
                    }`}
                  >
                    {/* Sender Name info */}
                    <span className="text-[10px] text-[var(--muted)] px-1 font-semibold">
                      {msg.senderName || (isClient ? "User" : isNote ? "System Note" : "Admin")}
                    </span>

                    {/* Bubble body */}
                    <div
                      className={`p-4 rounded-[20px] shadow-md border ${
                        isNote
                          ? "bg-[rgba(245,158,11,0.12)] border-amber-500/30 text-amber-900 dark:text-amber-100 rounded-tr-none"
                          : isClient
                          ? "bg-[var(--panel-strong)] border-[var(--panel-border)] text-[var(--foreground)] rounded-tl-none"
                          : "bg-[var(--accent-cream)] border-[var(--accent)]/30 text-[var(--foreground)] rounded-tr-none"
                      }`}
                    >
                      {isNote && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold mb-2 uppercase tracking-wider">
                          <Lock size={12} />
                          Internal Note
                        </div>
                      )}

                      {/* Text */}
                      {msg.text && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      )}

                      {/* Attachment preview */}
                      {msg.attachmentUrl && (
                        <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
                          {msg.type === "image" && (
                            <img
                              src={msg.attachmentUrl}
                              alt={msg.attachmentName || "Attachment"}
                              className="max-w-full max-h-[250px] rounded-[12px] object-cover cursor-pointer hover:opacity-85 border border-white/10"
                              onClick={() => setLightboxImage(msg.attachmentUrl || null)}
                            />
                          )}
                          {msg.type === "video" && (
                            <video
                              src={msg.attachmentUrl}
                              controls
                              className="max-w-full max-h-[250px] rounded-[12px] border border-white/10"
                            />
                          )}
                          {msg.type === "audio" && (
                            <audio src={msg.attachmentUrl} controls className="w-full max-w-[280px]" />
                          )}
                          {msg.type === "document" && (
                            <a
                              href={msg.attachmentUrl}
                              download={msg.attachmentName || "file"}
                              className="flex items-center gap-2.5 p-2.5 bg-[var(--panel)] border border-[var(--panel-border)] hover:bg-[var(--panel-strong)] rounded-[12px] text-xs text-[var(--foreground)]"
                            >
                              <FileText size={16} />
                              <div className="flex-1 truncate">
                                <p className="font-semibold truncate">{msg.attachmentName || "Attachment"}</p>
                                {msg.attachmentSize && (
                                  <p className="text-[10px] text-[var(--muted)]">
                                    {(msg.attachmentSize / 1024).toFixed(1)} KB
                                  </p>
                                )}
                              </div>
                              <Download size={14} className="shrink-0" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer read receipts/status */}
                    <div className={`flex items-center gap-1.5 text-[9px] text-[var(--muted)] px-1 ${
                      isClient ? "justify-start" : "justify-end"
                    }`}>
                      {msg.createdAt && (
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {!isClient && (
                        msg.read ? (
                          <CheckCheck size={12} className="text-green-500" />
                        ) : (
                          <Check size={12} />
                        )
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicators */}
              {typingUsers[viewerKey]?.isTyping && (
                <div className="self-start flex flex-col gap-1 max-w-[70%]">
                  <span className="text-[10px] text-[var(--muted)] px-1 font-semibold">
                    {typingUsers[viewerKey].senderName}
                  </span>
                  <div className="p-3 bg-[var(--panel-strong)] border border-[var(--panel-border)] text-[var(--muted)] text-xs rounded-[16px] rounded-tl-none flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-1.5 h-1.5 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-1.5 h-1.5 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </span>
                    typing...
                  </div>
                </div>
              )}

              <div ref={messageEndRef} />
            </div>

            {/* Composer Box */}
            <div className="p-4 border-t border-[var(--panel-border)] bg-[var(--panel)] flex flex-col gap-3 shrink-0 relative">
              {/* Attachment summary */}
              {attachment && (
                <div className="flex items-center justify-between p-2.5 bg-[var(--panel-strong)] border border-[var(--panel-border)] rounded-[14px]">
                  <div className="flex items-center gap-2 text-xs truncate">
                    {attachment.type.startsWith("image/") ? (
                      <ImageIcon size={16} className="text-green-500" />
                    ) : attachment.type.startsWith("video/") ? (
                      <Video size={16} className="text-red-500" />
                    ) : (
                      <FileText size={16} className="text-[var(--accent)]" />
                    )}
                    <span className="truncate text-[var(--foreground)] font-medium">{attachment.name}</span>
                    <span className="text-[10px] text-[var(--muted)]">
                      ({(attachment.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button onClick={() => setAttachment(null)} className="text-[var(--muted)] hover:text-white">
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Composer tools */}
              <div className="flex items-center justify-between">
                <div className="flex gap-3 items-center">
                  {/* File Upload button */}
                  <label className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition">
                    <Paperclip size={18} />
                    <input type="file" className="hidden" onChange={handleFileChange} />
                  </label>

                  {/* Toggle Note Switch */}
                  <button
                    onClick={() => setIsInternal(!isInternal)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition border ${
                      isInternal
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-500"
                        : "bg-transparent border-[var(--panel-border)] text-[var(--muted)] hover:border-[var(--accent)]"
                    }`}
                  >
                    <Lock size={12} />
                    {isInternal ? "Internal Note Mode" : "Public Reply"}
                  </button>
                </div>

                {/* Info status info */}
                <span className="text-[10px] text-[var(--muted)]">
                  Type <span className="font-mono text-[var(--accent)] bg-[var(--panel-strong)] px-1 py-0.5 rounded">/</span> for quick templates
                </span>
              </div>

              {/* Main Textarea + send button */}
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={composerInputRef}
                    rows={1}
                    value={messageText}
                    onChange={(e) => handleComposerChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessageMutation.mutate();
                      }
                    }}
                    placeholder={isInternal ? "Write internal note visible only to admins..." : "Type your message..."}
                    className={`w-full max-h-36 min-h-[44px] py-3 pl-4 pr-12 text-sm rounded-[18px] border text-[var(--foreground)] focus:outline-none resize-none ${
                      isInternal
                        ? "bg-[rgba(245,158,11,0.06)] border-amber-500/30 focus:border-amber-500"
                        : "bg-[var(--panel-strong)] border-[var(--panel-border)] focus:border-[var(--accent)]"
                    }`}
                  />
                  
                  {/* Quick canned template floating menu */}
                  {showCanned && (
                    <div className="absolute bottom-full left-0 mb-2 w-80 bg-[var(--panel-strong)] border border-[var(--panel-border)] rounded-[18px] shadow-2xl p-2 z-50 flex flex-col gap-1 max-h-60 overflow-y-auto">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider border-b border-[var(--panel-border)]">
                        Canned Responses
                      </div>
                      {filteredCanned.length === 0 ? (
                        <div className="p-3 text-xs text-center text-[var(--muted)]">No templates match search</div>
                      ) : (
                        filteredCanned.map((c) => (
                          <button
                            key={c.trigger}
                            onClick={() => handleSelectCanned(c.text)}
                            className="w-full text-left p-2.5 rounded-[12px] hover:bg-[var(--panel)] text-xs flex flex-col gap-1 text-[var(--foreground)] border border-transparent hover:border-[var(--panel-border)]"
                          >
                            <span className="font-mono text-[var(--accent)] font-bold">{c.trigger}</span>
                            <span className="truncate text-[var(--muted)]">{c.text}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <button
                  disabled={(!messageText.trim() && !attachment) || sendMessageMutation.isPending}
                  onClick={() => sendMessageMutation.mutate()}
                  className="p-3 bg-[var(--accent)] hover:bg-[var(--accent-strong)] disabled:opacity-40 disabled:hover:bg-[var(--accent)] text-white rounded-[18px] transition shrink-0 shadow-md"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[var(--background)]">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-[36px] bg-[var(--panel)] border border-[var(--panel-border)] flex items-center justify-center shadow-md text-[var(--accent)] animate-float-gentle">
                <Volume2 size={42} />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--accent)] border-4 border-[var(--background)] animate-pulse" />
            </div>

            <h3 className="text-xl font-bold tracking-tight text-[var(--foreground)] mb-2">Darji Support Command Center</h3>
            <p className="text-sm text-[var(--muted)] max-w-sm mb-6">
              Monitor customer logs, claim tickets, and action account update request verification workflows in real-time.
            </p>

            {onExit == null && (
              <button
                onClick={() => setIsFullScreen((v) => !v)}
                className="mb-6 flex items-center gap-2 px-4 py-2 rounded-[14px] bg-[var(--panel)] border border-[var(--panel-border)] hover:border-[var(--accent)] text-[var(--muted)] hover:text-[var(--foreground)] text-xs font-semibold transition"
              >
                {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                {isFullScreen ? "Exit Full Screen" : "Expand to Full Screen"}
              </button>
            )}

            <div className="grid grid-cols-3 gap-6 max-w-xl w-full border-t border-[var(--panel-border)] pt-8">
              <div className="p-4 bg-[var(--panel)] rounded-[20px] border border-[var(--panel-border)]">
                <p className="text-2xl font-bold text-[var(--accent)]">{supportStats?.openTickets ?? 0}</p>
                <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider mt-1">Open Tickets</p>
              </div>
              <div className="p-4 bg-[var(--panel)] rounded-[20px] border border-[var(--panel-border)]">
                <p className="text-2xl font-bold text-[var(--accent)]">
                  {changeRequests.filter((r) => r.status === "PENDING").length}
                </p>
                <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider mt-1">Pending Requests</p>
              </div>
              <div className="p-4 bg-[var(--panel)] rounded-[20px] border border-[var(--panel-border)]">
                <p className="text-2xl font-bold text-[var(--accent)]">
                  {bugReports.filter((b) => b.status === "NEW").length}
                </p>
                <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider mt-1">Unsolved Bugs</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* COLUMN 4: Context / Audit Panel (320px) */}
      {activeId && (
        <div className="w-[320px] flex shrink-0 flex-col gap-4 rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel)] p-5 shadow-xl overflow-y-auto">
          {/* User profile details */}
          {currentChatUser && (
            <div className="flex flex-col items-center text-center pb-4 border-b border-[var(--panel-border)]">
              <div className="w-16 h-16 rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel-strong)] overflow-hidden flex items-center justify-center relative shadow-sm">
                {currentChatUser.avatarUrl ? (
                  <img src={currentChatUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <img src={getDefaultAvatarUrl(currentChatUser.name ?? currentChatUser.phone ?? "User")} alt="Default avatar" className="w-full h-full object-cover" />
                )}
              </div>
              <h5 className="mt-3 font-bold text-sm text-[var(--foreground)]">{currentChatUser.name || "Customer"}</h5>
              <p className="text-xs text-[var(--muted)] font-semibold mt-1">
                {currentChatUser.role} • {currentChatUser.phone}
              </p>
              {currentChatUser.email && (
                <p className="text-xs text-[var(--muted)] mt-0.5">{currentChatUser.email}</p>
              )}
            </div>
          )}

          {/* Ticket metadata */}
          {activeTicket && (
            <div className="flex flex-col gap-3">
              <h6 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Ticket Information</h6>
              <div className="p-3.5 bg-[var(--panel-strong)] rounded-[18px] border border-[var(--panel-border)] text-xs flex flex-col gap-2.5">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Category</span>
                  <span className="text-[var(--foreground)] font-semibold">{activeTicket.category || "General"}</span>
                </div>
                {activeTicket.orderId && (
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Order ID</span>
                    <span className="text-[var(--accent)] font-semibold truncate hover:underline cursor-pointer">
                      {activeTicket.order?.orderNumber || activeTicket.orderId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Opened</span>
                  <span className="text-[var(--foreground)]">
                    {activeTicket.createdAt ? new Date(activeTicket.createdAt).toLocaleDateString() : ""}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Account change verification workflow */}
          {activeRequest && (
            <div className="flex flex-col gap-4">
              <h6 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Verification Request</h6>

              {/* Diff changes display */}
              <div className="p-4 bg-[var(--panel-strong)] rounded-[20px] border border-[var(--panel-border)] text-xs flex flex-col gap-3.5">
                <div>
                  <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider mb-1.5">Current Values</p>
                  <pre className="p-2.5 bg-[var(--panel-strong)] border border-[var(--panel-border)] rounded-[12px] font-mono text-[11px] text-[var(--muted)] whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(activeRequest.currentValues || {}, null, 2)}
                  </pre>
                </div>

                <div>
                  <p className="text-[10px] text-green-500 uppercase font-bold tracking-wider mb-1.5">Requested Values</p>
                  <pre className="p-2.5 bg-[var(--panel-strong)] border border-green-500/30 rounded-[12px] font-mono text-[11px] text-green-700 dark:text-green-400 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(activeRequest.requestedValues || {}, null, 2)}
                  </pre>
                </div>

                {activeRequest.documents && activeRequest.documents.length > 0 && (
                  <div>
                    <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider mb-1.5">Verification Documents</p>
                    <div className="flex flex-col gap-1.5">
                      {activeRequest.documents.map((doc, idx) => (
                        <a
                          key={idx}
                          href={doc}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-2.5 bg-[var(--panel-strong)] border border-[var(--panel-border)] hover:border-[var(--accent)] rounded-[12px] text-[11px] text-[var(--foreground)] transition"
                        >
                          <span className="truncate flex items-center gap-1.5">
                            <FileText size={13} />
                            Document #{idx + 1}
                          </span>
                          <ExternalLink size={12} className="shrink-0 text-[var(--accent)]" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit history list */}
                {activeRequest.history && activeRequest.history.length > 0 && (
                  <div className="border-t border-[var(--panel-border)] pt-3.5">
                    <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock size={12} />
                      Audit Trail History
                    </p>
                    <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-1">
                      {activeRequest.history.map((h, i) => (
                        <div key={i} className="p-2.5 bg-[var(--panel-strong)] border border-[var(--panel-border)] rounded-[12px] text-[10px]">
                          <div className="flex justify-between items-center mb-1">
                            <span className={`font-semibold ${h.status === "APPROVED" ? "text-green-500" : "text-red-500"}`}>
                              {h.status}
                            </span>
                            <span className="text-[var(--muted)]">
                              {h.processedAt ? new Date(h.processedAt).toLocaleDateString() : ""}
                            </span>
                          </div>
                          <p className="text-[var(--foreground)] mt-1">
                            Actioned by: <strong>{h.processedByName || "Admin"}</strong>
                          </p>
                          {h.adminNotes && <p className="text-[var(--muted)] mt-1 italic">"{h.adminNotes}"</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons if Pending */}
              {activeRequest.status === "PENDING" && (
                <div className="flex flex-col gap-2 mt-2">
                  <button
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(activeRequest.id)}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-bold rounded-[16px] transition flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Check size={16} />
                    Approve Update
                  </button>

                  <button
                    disabled={rejectMutation.isPending}
                    onClick={() => {
                      const reason = prompt("Enter verification rejection reason:");
                      if (reason !== null) {
                        rejectMutation.mutate({ requestId: activeRequest.id, notes: reason });
                      }
                    }}
                    className="w-full py-3 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-[16px] transition flex items-center justify-center gap-1.5"
                  >
                    <X size={16} />
                    Reject Update
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Activity / internal log trail */}
          <div className="flex flex-col gap-3 mt-auto">
            <h6 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Activity Log</h6>
            <div className="p-3.5 bg-[var(--panel-strong)] rounded-[18px] border border-[var(--panel-border)] text-[10px] text-[var(--muted)] flex flex-col gap-2">
              <div className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1 shrink-0" />
                <span>Operator connected securely</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full mt-1 shrink-0" />
                <span>Socket.IO listeners listening to real-time events</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX ZOOM MODAL */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[999] flex items-center justify-center p-6 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
            >
              <X size={20} />
            </button>
            <img src={lightboxImage} alt="Zoomed view" className="max-w-full max-h-[85vh] rounded-[18px] object-contain shadow-2xl border border-white/10" />
          </div>
        </div>
      )}
    </div>
  );
}
