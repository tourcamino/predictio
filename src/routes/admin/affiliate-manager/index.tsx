import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Users,
  MessageSquare,
  Network,
  TrendingUp,
  LayoutDashboard,
  Plus,
  Search,
  Filter,
  X,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { mockAffiliateContacts, mockNetworks, mockAnalysts } from "~/data/mockAffiliates";
import { AICostMonitor } from "~/components/admin/AICostMonitor";
import { generateOutreachMessage } from "~/services/aiTasks";
import type { AffiliateContact, AffiliateNetwork, Task } from "~/types/affiliate";

export const Route = createFileRoute("/admin/affiliate-manager/")({
  component: AffiliateManagerPage,
});

function AffiliateManagerPage() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "contacts" | "outreach" | "networks" | "performance"
  >("dashboard");

  // State from localStorage
  const [contacts, setContacts] = useState<AffiliateContact[]>(() => {
    const saved = localStorage.getItem("predictio_affiliate_contacts");
    return saved ? JSON.parse(saved) : mockAffiliateContacts;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("predictio_affiliate_tasks");
    return saved ? JSON.parse(saved) : [];
  });

  const [networks, setNetworks] = useState<AffiliateNetwork[]>(() => {
    const saved = localStorage.getItem("predictio_affiliate_networks");
    return saved ? JSON.parse(saved) : mockNetworks;
  });

  // Save to localStorage on changes
  useEffect(() => {
    localStorage.setItem("predictio_affiliate_contacts", JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem("predictio_affiliate_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("predictio_affiliate_networks", JSON.stringify(networks));
  }, [networks]);

  // Task management
  const addTask = (text: string) => {
    setTasks([
      ...tasks,
      { id: Date.now().toString(), text, done: false, createdAt: Date.now() },
    ]);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const clearDoneTasks = () => {
    setTasks(tasks.filter((t) => !t.done));
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-syne font-bold text-3xl mb-2">
                🤝 Affiliate Manager
              </h1>
              <p className="text-gray-400">
                Manage affiliate partnerships and outreach
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Your Role</div>
              <div className="font-semibold">Head of Affiliate Partnerships</div>
              <div className="text-xs text-gray-500 mt-1">
                affiliate@predictio.live
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { key: "contacts", label: "Contacts", icon: Users },
              { key: "outreach", label: "AI Outreach", icon: MessageSquare },
              { key: "networks", label: "Networks", icon: Network },
              { key: "performance", label: "Performance", icon: TrendingUp },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? "bg-brand-green text-brand-bg"
                      : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "dashboard" && (
          <DashboardTab
            contacts={contacts}
            tasks={tasks}
            addTask={addTask}
            toggleTask={toggleTask}
            clearDoneTasks={clearDoneTasks}
          />
        )}
        {activeTab === "contacts" && (
          <ContactsTab contacts={contacts} setContacts={setContacts} />
        )}
        {activeTab === "outreach" && <OutreachTab contacts={contacts} />}
        {activeTab === "networks" && (
          <NetworksTab networks={networks} setNetworks={setNetworks} />
        )}
        {activeTab === "performance" && <PerformanceTab />}
      </div>
    </div>
  );
}

function DashboardTab({
  contacts,
  tasks,
  addTask,
  toggleTask,
  clearDoneTasks,
}: {
  contacts: AffiliateContact[];
  tasks: Task[];
  addTask: (text: string) => void;
  toggleTask: (id: string) => void;
  clearDoneTasks: () => void;
}) {
  const [newTaskText, setNewTaskText] = useState("");

  const pipelineCount = contacts.length;
  const activeAnalysts = mockAnalysts.length;
  const totalVolume = mockAnalysts.reduce((sum, a) => sum + a.volumeGenerated, 0);
  const totalRevenue = totalVolume * 0.008; // 0.8% platform fee

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-400">Pipeline Contacts</div>
            <Users className="w-5 h-5 text-brand-green" />
          </div>
          <div className="font-mono font-bold text-3xl">{pipelineCount}</div>
          <div className="text-xs text-gray-500 mt-1">
            +5 this week
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-400">Active Analysts</div>
            <TrendingUp className="w-5 h-5 text-brand-cyan" />
          </div>
          <div className="font-mono font-bold text-3xl">{activeAnalysts}</div>
          <div className="text-xs text-green-400 mt-1">↑ +3 this month</div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-400">Vol from Affiliates</div>
            <ChevronRight className="w-5 h-5 text-brand-green" />
          </div>
          <div className="font-mono font-bold text-3xl text-brand-green">
            ${(totalVolume / 1000).toFixed(0)}K
          </div>
          <div className="text-xs text-green-400 mt-1">↑ +18% this month</div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-400">Revenue Attributed</div>
            <TrendingUp className="w-5 h-5 text-brand-cyan" />
          </div>
          <div className="font-mono font-bold text-3xl text-brand-cyan">
            ${(totalRevenue / 1000).toFixed(1)}K
          </div>
          <div className="text-xs text-gray-500 mt-1">this month</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-syne font-bold text-lg">Today's Tasks</h3>
            {tasks.filter((t) => t.done).length > 0 && (
              <button
                onClick={clearDoneTasks}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Clear Done
              </button>
            )}
          </div>

          <div className="space-y-2 mb-4">
            {tasks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No tasks yet. Add one below.
              </p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded hover:bg-white/10 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-brand-green checked:border-brand-green"
                  />
                  <span
                    className={`flex-1 text-sm ${
                      task.done ? "line-through text-gray-500" : ""
                    }`}
                  >
                    {task.text}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTaskText.trim()) {
                  addTask(newTaskText);
                  setNewTaskText("");
                }
              }}
              placeholder="Add a task..."
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded focus:border-brand-green focus:outline-none text-sm"
            />
            <button
              onClick={() => {
                if (newTaskText.trim()) {
                  addTask(newTaskText);
                  setNewTaskText("");
                }
              }}
              className="px-4 py-2 bg-brand-green text-brand-bg font-semibold rounded hover:bg-brand-green/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI Cost Monitor */}
        <AICostMonitor />
      </div>

      {/* Recent Activity */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h3 className="font-syne font-bold text-lg mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            {
              time: "2h ago",
              text: "Message sent to @FootballGuru via X",
              icon: Send,
              color: "text-brand-cyan",
            },
            {
              time: "1d ago",
              text: "New analyst approved: UFC_DataDriven",
              icon: CheckCircle,
              color: "text-brand-green",
            },
            {
              time: "2d ago",
              text: "Network replied: BettingInsider",
              icon: MessageSquare,
              color: "text-brand-cyan",
            },
            {
              time: "3d ago",
              text: "Payout approved: $890 CricketOracle",
              icon: TrendingUp,
              color: "text-brand-green",
            },
          ].map((activity, i) => {
            const Icon = activity.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-white/5 rounded"
              >
                <Icon className={`w-4 h-4 ${activity.color}`} />
                <span className="flex-1 text-sm">{activity.text}</span>
                <span className="text-xs text-gray-500 font-mono">
                  {activity.time}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ContactsTab({
  contacts,
  setContacts,
}: {
  contacts: AffiliateContact[];
  setContacts: (contacts: AffiliateContact[]) => void;
}) {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<AffiliateContact | null>(null);

  const stages: Array<AffiliateContact["stage"]> = [
    "identified",
    "contacted",
    "replied",
    "negotiating",
    "active",
    "closed",
  ];

  const stageLabels = {
    identified: "Identified",
    contacted: "Contacted",
    replied: "Replied",
    negotiating: "Negotiating",
    active: "Active",
    closed: "Closed",
  };

  const filteredContacts = contacts.filter(
    (c) =>
      searchQuery === "" ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.platform.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded focus:border-brand-green focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("kanban")}
            className={`px-4 py-2 rounded font-semibold text-sm ${
              view === "kanban"
                ? "bg-brand-green text-brand-bg"
                : "bg-white/5 text-gray-400"
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => setView("table")}
            className={`px-4 py-2 rounded font-semibold text-sm ${
              view === "table"
                ? "bg-brand-green text-brand-bg"
                : "bg-white/5 text-gray-400"
            }`}
          >
            Table
          </button>
        </div>
        <button className="px-4 py-2 bg-brand-green text-brand-bg font-semibold rounded hover:bg-brand-green/90 transition-colors">
          <Plus className="w-4 h-4 inline mr-2" />
          Add Contact
        </button>
      </div>

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stages.map((stage) => {
            const stageContacts = filteredContacts.filter((c) => c.stage === stage);
            return (
              <div key={stage} className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm">{stageLabels[stage]}</h3>
                  <span className="text-xs text-gray-500 font-mono">
                    {stageContacts.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {stageContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className="w-full text-left p-3 bg-white/5 border border-white/10 rounded hover:bg-white/10 hover:border-brand-green/30 transition-all"
                    >
                      <div className="font-semibold text-sm mb-1">{contact.name}</div>
                      <div className="text-xs text-gray-500 mb-2">
                        {contact.platform} · {contact.followers}
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold ${
                            contact.priority === "high"
                              ? "text-red-400"
                              : contact.priority === "medium"
                                ? "text-yellow-400"
                                : "text-gray-400"
                          }`}
                        >
                          {contact.priority.toUpperCase()}
                        </span>
                        <span className="text-xs text-brand-green">
                          {contact.fitScore}/100
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contact Detail Panel */}
      {selectedContact && (
        <ContactDetailPanel
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
        />
      )}
    </div>
  );
}

function ContactDetailPanel({
  contact,
  onClose,
}: {
  contact: AffiliateContact;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-brand-bg border border-white/10 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-brand-bg border-b border-white/10 p-6 flex items-center justify-between">
          <h2 className="font-syne font-bold text-2xl">{contact.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-sm text-gray-400 mb-3">
              CONTACT INFO
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Type</span>
                <span className="font-semibold">{contact.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Platform</span>
                <span className="font-semibold">{contact.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Followers</span>
                <span className="font-semibold">{contact.followers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Region</span>
                <span className="font-semibold">{contact.region}</span>
              </div>
            </div>
          </div>

          {/* Fit Score */}
          <div>
            <h3 className="font-semibold text-sm text-gray-400 mb-3">
              PREDICTIO FIT SCORE
            </h3>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-mono font-bold text-brand-green">
                {contact.fitScore}/100
              </div>
              <div className="flex-1">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-green to-brand-cyan"
                    style={{ width: `${contact.fitScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="font-semibold text-sm text-gray-400 mb-3">NOTES</h3>
            <p className="text-sm text-gray-300">{contact.notes}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button className="flex-1 px-4 py-2 bg-brand-green text-brand-bg font-semibold rounded hover:bg-brand-green/90 transition-colors">
              🤖 Generate Message
            </button>
            <button className="flex-1 px-4 py-2 bg-white/5 border border-white/10 font-semibold rounded hover:bg-white/10 transition-colors">
              ✉️ Log Contact
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OutreachTab({ contacts }: { contacts: AffiliateContact[] }) {
  const [selectedContact, setSelectedContact] = useState<string>("");
  const [channel, setChannel] = useState("x_dm");
  const [goal, setGoal] = useState("intro");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("EN");
  const [context, setContext] = useState("");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!selectedContact) return;
    
    const contact = contacts.find((c) => c.id === selectedContact);
    if (!contact) return;

    setIsGenerating(true);
    try {
      const result = await generateOutreachMessage(
        {
          name: contact.name,
          type: contact.type,
          sport: contact.sport.join(", "),
          platform: contact.platform,
          followers: contact.followers,
        },
        channel,
        goal,
        tone,
        language,
        context
      );
      setGeneratedMessage(result.text);
    } catch (error) {
      console.error("Error generating message:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="font-syne font-bold text-2xl mb-2">AI Message Generator</h2>
        <p className="text-sm text-gray-400 mb-6">
          Powered by open-source models via OpenRouter
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Contact *
            </label>
            <select
              value={selectedContact}
              onChange={(e) => setSelectedContact(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded focus:border-brand-green focus:outline-none"
            >
              <option value="">Select a contact...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.platform} · {c.followers}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Channel *
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded focus:border-brand-green focus:outline-none"
              >
                <option value="x_dm">X/Twitter DM</option>
                <option value="email">Email</option>
                <option value="linkedin">LinkedIn</option>
                <option value="telegram">Telegram</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Goal *</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded focus:border-brand-green focus:outline-none"
              >
                <option value="intro">Introduce Affiliate Program</option>
                <option value="analyst">Invite as Analyst</option>
                <option value="network">Network Partnership</option>
                <option value="followup">Follow-up</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Context (optional)
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
              placeholder="e.g., They just posted about El Clasico..."
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded focus:border-brand-green focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!selectedContact || isGenerating}
            className="w-full px-6 py-3 bg-brand-green text-brand-bg font-bold rounded hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 animate-pulse" />
                Generating...
              </span>
            ) : (
              "🤖 Generate Message →"
            )}
          </button>
        </div>
      </div>

      {generatedMessage && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-syne font-bold text-lg">Generated Message</h3>
            <span className="text-xs text-gray-500">
              {generatedMessage.length} characters
            </span>
          </div>
          <div className="bg-white/5 rounded p-4 mb-4 text-sm whitespace-pre-wrap">
            {generatedMessage}
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors">
              Copy
            </button>
            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors">
              Edit
            </button>
            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors">
              🔄 Regenerate
            </button>
            <button className="px-4 py-2 bg-brand-green text-brand-bg font-semibold rounded hover:bg-brand-green/90 transition-colors">
              Log as Sent
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NetworksTab({
  networks,
  setNetworks,
}: {
  networks: AffiliateNetwork[];
  setNetworks: (networks: AffiliateNetwork[]) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-syne font-bold text-2xl">Affiliate Networks</h2>
        <button className="px-4 py-2 bg-brand-green text-brand-bg font-semibold rounded hover:bg-brand-green/90 transition-colors">
          <Plus className="w-4 h-4 inline mr-2" />
          Add Network
        </button>
      </div>

      <div className="grid gap-6">
        {networks.map((network) => (
          <div
            key={network.id}
            className="bg-white/5 border border-white/10 rounded-lg p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-syne font-bold text-xl mb-1">
                  {network.name}
                </h3>
                <p className="text-sm text-gray-400">{network.website}</p>
              </div>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded text-sm font-semibold">
                {network.stage}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">Reach</div>
                <div className="font-semibold">{network.reach}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Affiliates</div>
                <div className="font-semibold">{network.affiliatesCount}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Rev Share</div>
                <div className="font-semibold text-brand-green">
                  {network.proposedRevShare}%
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Contact</div>
                <div className="text-sm truncate">{network.contact}</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-2">Verticals</div>
              <div className="flex flex-wrap gap-2">
                {network.verticals.map((v, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-white/10 rounded text-xs"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button className="px-4 py-2 bg-brand-green text-brand-bg font-semibold rounded hover:bg-brand-green/90 transition-colors">
                🤖 Generate Proposal
              </button>
              <button className="px-4 py-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors">
                Update
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerformanceTab() {
  return (
    <div className="space-y-6">
      <h2 className="font-syne font-bold text-2xl">Performance Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="text-sm text-gray-400 mb-2">Total Commissions Paid</div>
          <div className="font-mono font-bold text-3xl text-brand-green">
            $18,400
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="text-sm text-gray-400 mb-2">Platform Revenue</div>
          <div className="font-mono font-bold text-3xl text-brand-cyan">
            $55,120
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="text-sm text-gray-400 mb-2">Program ROI</div>
          <div className="font-mono font-bold text-3xl text-brand-green">
            300%
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h3 className="font-syne font-bold text-lg mb-4">Top Performers</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left py-3 text-sm font-semibold text-gray-400">
                  Analyst
                </th>
                <th className="text-left py-3 text-sm font-semibold text-gray-400">
                  Vol Generated
                </th>
                <th className="text-left py-3 text-sm font-semibold text-gray-400">
                  Commission
                </th>
                <th className="text-left py-3 text-sm font-semibold text-gray-400">
                  Last Active
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {mockAnalysts.map((analyst) => (
                <tr key={analyst.id}>
                  <td className="py-3 font-semibold">{analyst.displayName}</td>
                  <td className="py-3 font-mono text-brand-green">
                    ${(analyst.volumeGenerated / 1000).toFixed(0)}K
                  </td>
                  <td className="py-3 font-mono text-brand-cyan">
                    ${analyst.totalEarned.toLocaleString()}
                  </td>
                  <td className="py-3 text-sm text-gray-400">
                    {analyst.activityDays}d ago
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
