import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, Database, Users, Target } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: "#0f172a" }}>
      <header
        className="border-b border-white/10 backdrop-blur-md"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Experience</span>
            </Link>
            <h1 className="text-2xl font-bold text-purple-300">About Loop</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance">
              <span className="text-purple-300">Student Thesis Project</span>
            </h2>
            <p className="text-xl text-gray-300 text-balance max-w-3xl mx-auto leading-relaxed">
              Loop is an immersive social awareness platform developed as part of academic research into
              empathy-building through interactive storytelling and perspective-taking experiences.
            </p>
          </div>

          {/* Project Details Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50">
              <div className="flex items-center mb-4">
                <Target className="w-8 h-8 text-blue-400 mr-3" />
                <h3 className="text-2xl font-semibold text-white">Research Objective</h3>
              </div>
              <p className="text-gray-300 leading-relaxed">
                To investigate how immersive digital experiences can foster empathy and social awareness by allowing
                users to experience life from different perspectives and navigate complex social challenges.
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50">
              <div className="flex items-center mb-4">
                <BookOpen className="w-8 h-8 text-purple-400 mr-3" />
                <h3 className="text-2xl font-semibold text-white">Academic Context</h3>
              </div>
              <p className="text-gray-300 leading-relaxed">
                This platform serves as both a research tool and practical application, exploring the intersection of
                technology, psychology, and social education in creating meaningful learning experiences.
              </p>
            </div>
          </div>

          {/* Data and Methodology */}
          <div className="bg-slate-800/30 rounded-2xl p-8 border border-slate-700/30 mb-16">
            <div className="flex items-center mb-6">
              <Database className="w-8 h-8 text-green-400 mr-3" />
              <h3 className="text-3xl font-semibold text-white">Data & Methodology</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xl font-medium text-blue-300 mb-3">Data Sources</h4>
                <ul className="text-gray-300 space-y-2">
                  <li>• Real-world social issue case studies</li>
                  <li>• Academic research on empathy development</li>
                  <li>• User interaction and decision-making patterns</li>
                  <li>• Psychological assessment frameworks</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xl font-medium text-purple-300 mb-3">Research Methods</h4>
                <ul className="text-gray-300 space-y-2">
                  <li>• Interactive scenario-based learning</li>
                  <li>• Perspective-taking simulations</li>
                  <li>• Behavioral tracking and analysis</li>
                  <li>• Qualitative user experience studies</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Impact and Goals */}
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50 mb-12">
            <div className="flex items-center mb-6">
              <Users className="w-8 h-8 text-pink-400 mr-3" />
              <h3 className="text-3xl font-semibold text-white">Impact & Goals</h3>
            </div>
            <p className="text-gray-300 leading-relaxed text-lg mb-6">
              The ultimate goal is to demonstrate how technology can be leveraged to create more empathetic, socially
              aware individuals who better understand the complexities of social issues and the diverse experiences of
              others in our interconnected world.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full text-sm border border-blue-400/30">
                Empathy Development
              </span>
              <span className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-full text-sm border border-purple-400/30">
                Social Awareness
              </span>
              <span className="px-4 py-2 bg-green-500/20 text-green-300 rounded-full text-sm border border-green-400/30">
                Educational Technology
              </span>
              <span className="px-4 py-2 bg-pink-500/20 text-pink-300 rounded-full text-sm border border-pink-400/30">
                Behavioral Research
              </span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-300 mb-6 text-lg">
              Ready to contribute to this research by exploring different perspectives?
            </p>
            <Button
              size="lg"
              className="text-lg px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 !text-white shadow-2xl transform hover:scale-105 transition-all duration-300 border-0"
              asChild
            >
              <Link href="/avatar">Start Your Journey</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
