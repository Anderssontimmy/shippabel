import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, Calendar } from "lucide-react";
import { blogPosts } from "@/lib/blog-data";

export const BlogIndex = () => {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
      <div className="text-center mb-16">
        <h1 className="text-3xl sm:text-4xl font-semibold text-surface-900 mb-4">
          Learn how to publish your app
        </h1>
        <p className="text-lg text-surface-500 max-w-2xl mx-auto">
          Step-by-step guides for getting your AI-built app on the App Store and Google Play.
          No technical knowledge required.
        </p>
      </div>

      <div className="space-y-6">
        {blogPosts.map((post) => (
          <Link key={post.slug} to={`/blog/${post.slug}`}>
            <article className="group rounded-2xl border border-surface-200 bg-white p-6 sm:p-8 hover:border-surface-300 hover:shadow-sm transition-all">
              <div className="flex items-center gap-3 text-xs text-surface-400 mb-3">
                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">{post.category}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.readTime}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{post.date}</span>
              </div>
              <h2 className="text-xl font-semibold text-surface-900 mb-2 group-hover:text-green-700 transition-colors">
                {post.title}
              </h2>
              <p className="text-surface-500 text-sm leading-relaxed mb-4">{post.excerpt}</p>
              <span className="text-sm font-medium text-green-700 flex items-center gap-1">
                Read guide <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </article>
          </Link>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-16 text-center rounded-2xl bg-surface-50 border border-surface-200 p-10">
        <h2 className="text-xl font-semibold text-surface-900 mb-2">Ready to publish your app?</h2>
        <p className="text-surface-500 text-sm mb-6">Check if your app is ready for the stores — it's free and takes 30 seconds.</p>
        <Link to="/scan">
          <button className="inline-flex items-center gap-2 rounded-xl bg-surface-900 text-white px-7 py-3.5 text-sm font-medium hover:bg-surface-800 transition-colors">
            Check my app for free <ArrowRight className="h-4 w-4" />
          </button>
        </Link>
      </div>
    </div>
  );
};

export const BlogPost = () => {
  const { slug } = useParams();
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-surface-900 mb-4">Article not found</h1>
        <Link to="/blog" className="text-green-700 hover:text-green-800">← Back to all guides</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      {/* Back */}
      <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-700 mb-8 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> All guides
      </Link>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 text-xs text-surface-400 mb-4">
          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">{post.category}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.readTime}</span>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{post.date}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold text-surface-900 leading-tight mb-4">{post.title}</h1>
        <p className="text-lg text-surface-500">{post.excerpt}</p>
      </div>

      {/* Content */}
      <article
        className="prose prose-surface prose-lg max-w-none
          prose-headings:text-surface-900 prose-headings:font-semibold
          prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
          prose-p:text-surface-600 prose-p:leading-relaxed
          prose-li:text-surface-600
          prose-strong:text-surface-900
          prose-a:text-green-700 prose-a:no-underline hover:prose-a:underline
        "
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* CTA */}
      <div className="mt-16 rounded-2xl bg-green-50 border border-green-200 p-8 text-center">
        <h2 className="text-xl font-semibold text-surface-900 mb-2">Ready to try it yourself?</h2>
        <p className="text-surface-500 text-sm mb-6">Shippabel handles everything mentioned in this guide — automatically.</p>
        <Link to="/scan">
          <button className="inline-flex items-center gap-2 rounded-xl bg-green-600 text-white px-7 py-3.5 text-sm font-medium hover:bg-green-700 transition-colors">
            Check my app for free <ArrowRight className="h-4 w-4" />
          </button>
        </Link>
      </div>

      {/* Related */}
      <div className="mt-16">
        <h3 className="text-lg font-semibold text-surface-900 mb-6">More guides</h3>
        <div className="space-y-3">
          {blogPosts.filter((p) => p.slug !== slug).slice(0, 3).map((p) => (
            <Link key={p.slug} to={`/blog/${p.slug}`} className="block rounded-xl border border-surface-200 p-4 hover:border-surface-300 transition-colors">
              <h4 className="font-medium text-surface-900 text-sm">{p.title}</h4>
              <p className="text-xs text-surface-400 mt-1">{p.readTime}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
