import { Link } from "react-router";
import { ArrowLeft, TrendingUp, MousePointerClick, Star, Plus, Eye, Calendar } from "lucide-react";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card } from "../components/ui/card";
import { useLanguage } from "../contexts/LanguageContext";
import { Navigation } from "../components/Navigation";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { motion } from "motion/react";

// Mock data for analytics
const pageViewsData = [
  { date: "Mar 1", views: 1240, clicks: 85 },
  { date: "Mar 5", views: 1580, clicks: 102 },
  { date: "Mar 10", views: 1820, clicks: 118 },
  { date: "Mar 15", views: 2100, clicks: 145 },
  { date: "Mar 20", views: 2350, clicks: 168 },
  { date: "Mar 25", views: 2680, clicks: 192 },
  { date: "Mar 30", views: 3120, clicks: 225 },
];

const ratingsData = [
  { date: "Week 1", rating: 4.3, reviews: 12 },
  { date: "Week 2", rating: 4.5, reviews: 18 },
  { date: "Week 3", rating: 4.6, reviews: 25 },
  { date: "Week 4", rating: 4.8, reviews: 31 },
];

const categoryPerformance = [
  { category: "Copywriting", tools: 8, views: 12500, engagement: 78 },
  { category: "Image Gen", tools: 6, views: 9800, engagement: 82 },
  { category: "Code", tools: 5, views: 8200, engagement: 85 },
  { category: "Video", tools: 4, views: 7100, engagement: 71 },
  { category: "Analytics", tools: 3, views: 5400, engagement: 68 },
];

const myTools = [
  {
    id: 1,
    name: "AI Content Writer Pro",
    category: "Copywriting",
    status: "Active",
    views: 3120,
    clicks: 225,
    rating: 4.8,
    featured: true,
  },
  {
    id: 2,
    name: "Smart Image Generator",
    category: "Image Generation",
    status: "Active",
    views: 2450,
    clicks: 178,
    rating: 4.6,
    featured: false,
  },
  {
    id: 3,
    name: "Code Assistant Plus",
    category: "Code Assistant",
    status: "Pending Review",
    views: 0,
    clicks: 0,
    rating: 0,
    featured: false,
  },
];

export function DashboardPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Developer Dashboard
            </h1>
            <p className="text-gray-400">Monitor your AI tools performance and manage listings</p>
          </div>
          <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add New Tool
          </Button>
        </div>

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-cyan-500/20 rounded-lg">
                <Eye className="w-6 h-6 text-cyan-400" />
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">+12.5%</Badge>
            </div>
            <div className="text-3xl font-bold text-white mb-1">5,570</div>
            <div className="text-gray-400 text-sm">Total Page Views</div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <MousePointerClick className="w-6 h-6 text-purple-400" />
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">+8.3%</Badge>
            </div>
            <div className="text-3xl font-bold text-white mb-1">403</div>
            <div className="text-gray-400 text-sm">Outbound Clicks</div>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 border-pink-500/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-pink-500/20 rounded-lg">
                <Star className="w-6 h-6 text-pink-400" />
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">+0.3</Badge>
            </div>
            <div className="text-3xl font-bold text-white mb-1">4.7</div>
            <div className="text-gray-400 text-sm">Average Rating</div>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-400" />
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">+15.2%</Badge>
            </div>
            <div className="text-3xl font-bold text-white mb-1">7.2%</div>
            <div className="text-gray-400 text-sm">Click-Through Rate</div>
          </Card>
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="overview" className="mb-8">
          <TabsList className="bg-[#1a0b2e]/50 border border-purple-500/20 mb-6">
            <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              Overview
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              Performance
            </TabsTrigger>
            <TabsTrigger value="ratings" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              Ratings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Page Views & Clicks Over Time</h2>
                <div className="flex items-center gap-2">
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    <Calendar className="w-3 h-3 mr-1" />
                    Last 30 Days
                  </Badge>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={pageViewsData}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#a855f7" opacity={0.1} />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a0b2e",
                      border: "1px solid #a855f7",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#22d3ee"
                    fillOpacity={1}
                    fill="url(#colorViews)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="#a855f7"
                    fillOpacity={1}
                    fill="url(#colorClicks)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="performance">
            <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Category Performance</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={categoryPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#a855f7" opacity={0.1} />
                  <XAxis dataKey="category" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a0b2e",
                      border: "1px solid #a855f7",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="views" fill="#22d3ee" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="engagement" fill="#a855f7" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="ratings">
            <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">User Ratings Trend</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={ratingsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#a855f7" opacity={0.1} />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis domain={[0, 5]} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a0b2e",
                      border: "1px solid #a855f7",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="rating" stroke="#22d3ee" strokeWidth={3} dot={{ fill: "#22d3ee", r: 6 }} />
                  <Line type="monotone" dataKey="reviews" stroke="#a855f7" strokeWidth={3} dot={{ fill: "#a855f7", r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>

        {/* My Tools Management */}
        <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">My AI Tools</h2>
            <Button variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20">
              Manage All
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-500/20">
                  <th className="text-left text-gray-400 font-semibold py-3 px-4">Tool Name</th>
                  <th className="text-left text-gray-400 font-semibold py-3 px-4">Category</th>
                  <th className="text-left text-gray-400 font-semibold py-3 px-4">Status</th>
                  <th className="text-center text-gray-400 font-semibold py-3 px-4">Views</th>
                  <th className="text-center text-gray-400 font-semibold py-3 px-4">Clicks</th>
                  <th className="text-center text-gray-400 font-semibold py-3 px-4">Rating</th>
                  <th className="text-right text-gray-400 font-semibold py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {myTools.map((tool) => (
                  <tr key={tool.id} className="border-b border-purple-500/10 hover:bg-purple-900/20 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="text-white font-semibold">{tool.name}</div>
                        {tool.featured && (
                          <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white border-0">
                            Featured
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant="outline" className="border-purple-500/50 text-purple-300">
                        {tool.category}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <Badge
                        className={
                          tool.status === "Active"
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        }
                      >
                        {tool.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-center text-white">{tool.views.toLocaleString()}</td>
                    <td className="py-4 px-4 text-center text-white">{tool.clicks.toLocaleString()}</td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white">{tool.rating > 0 ? tool.rating : "-"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20">
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Get Featured Section */}
        <div className="bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">Boost Your Tool's Visibility</h2>
              <p className="text-gray-400 mb-4">
                Get featured on the homepage and reach thousands of potential users. Featured tools receive 5x more views on average.
              </p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Priority placement on homepage</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Highlighted in category pages</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Featured badge on your listing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Social media promotion</span>
                </li>
              </ul>
            </div>
            <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-xl p-6 text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
                $99
              </div>
              <div className="text-gray-400 mb-6">per month</div>
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white">
                Get Featured Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}