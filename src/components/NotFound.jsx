import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { usePageTitle } from "../lib/usePageTitle.js";

export default function NotFound() {
  usePageTitle("Page Not Found");

  return (
    <div className="max-w-md mx-auto px-6 pt-24 pb-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card p-8"
      >
        <span className="font-mono text-xs text-teal">404</span>
        <h1 className="font-display text-2xl text-ink mt-2 mb-2">Page not found</h1>
        <p className="text-muted text-sm mb-6">
          The page you're looking for doesn't exist, or the link may be out of date.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-3 rounded-full bg-teal text-white font-medium hover:bg-teal-dark transition-colors"
        >
          Back to home
        </Link>
      </motion.div>
    </div>
  );
}