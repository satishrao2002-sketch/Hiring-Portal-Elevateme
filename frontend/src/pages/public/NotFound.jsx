import { Link } from "react-router-dom";
import PublicLayout from "@/components/public/PublicLayout";
import Seo from "@/seo/Seo";
import { PageWrap, ProductCta } from "@/components/public/parts";

export default function NotFound() {
  return (
    <PublicLayout>
      <Seo title="Page Not Found | ElevateMe" description="The page you're looking for doesn't exist." path="" noindex />
      <PageWrap>
        <div className="pt-28" data-testid="not-found">
          <p className="label-eyebrow text-terracotta">404</p>
          <h1 className="font-display text-4xl md:text-5xl text-charcoal mb-4">We couldn't find that page.</h1>
          <p className="text-bodygray max-w-xl mb-6">The link may be broken or the page may have moved. Explore our career guides, skills and jobs instead.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/careers" className="bg-white border border-bordergray rounded-full px-5 py-2.5 text-sm font-bold text-charcoal hover:border-terracotta hover:text-terracotta transition-colors" data-testid="nf-careers">Career Guides</Link>
            <Link to="/skills" className="bg-white border border-bordergray rounded-full px-5 py-2.5 text-sm font-bold text-charcoal hover:border-terracotta hover:text-terracotta transition-colors" data-testid="nf-skills">Skills</Link>
            <Link to="/jobs" className="bg-white border border-bordergray rounded-full px-5 py-2.5 text-sm font-bold text-charcoal hover:border-terracotta hover:text-terracotta transition-colors" data-testid="nf-jobs">Browse Jobs</Link>
          </div>
        </div>
        <ProductCta heading="Start where you belong" sub="Build a verified profile and get matched to roles that fit your background — in any industry."
          primary="Get Started" primaryTo="/register" secondary="Back Home" secondaryTo="/" />
      </PageWrap>
    </PublicLayout>
  );
}
