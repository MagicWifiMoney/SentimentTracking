#!/usr/bin/env python3
"""
Reddit Sentiment Tracker for Meepo Board
Extracts posts and comments mentioning Meepo Board from specified subreddits
and performs sentiment analysis to identify negative mentions.
"""

import json
import re
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any
import praw
import requests
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import nltk

# Download VADER lexicon if not already present
try:
    nltk.data.find('vader_lexicon')
except LookupError:
    nltk.download('vader_lexicon')

def load_reddit_credentials():
    """Load Reddit API credentials from environment or secrets file."""
    import os
    
    # Try environment variables first (for deployment)
    client_id = os.getenv('REDDIT_CLIENT_ID')
    client_secret = os.getenv('REDDIT_CLIENT_SECRET')  
    user_agent = os.getenv('REDDIT_USER_AGENT')
    
    if client_id and client_secret and user_agent:
        return {
            'client_id': client_id,
            'client_secret': client_secret,
            'user_agent': user_agent
        }
    
    # If environment variables not found, credentials should be passed via API call
    print("Reddit credentials not found in environment variables")
    print("Please ensure REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, and REDDIT_USER_AGENT are set")
    return None

def setup_reddit_client(credentials):
    """Initialize Reddit client with PRAW."""
    return praw.Reddit(
        client_id=credentials['client_id'],
        client_secret=credentials['client_secret'],
        user_agent=credentials['user_agent']
    )

def get_meepo_keywords():
    """Generate keywords and regex pattern for Meepo Board search."""
    keywords = [
        "Meepo Board", "MeepoBoard", "Meepo", 
        "Meepo Boad", "MeepoBord", "Meepo Board", 
        "meepo board", "meepoboard", "meepo",
        "MEEPO", "Mepo", "Meep0", "Me3po"
    ]
    
    # Create regex pattern for case-insensitive matching
    pattern = r'\b(?:' + '|'.join(re.escape(k) for k in keywords) + r')\b'
    return keywords, re.compile(pattern, re.IGNORECASE)

def analyze_sentiment(text):
    """Analyze sentiment using VADER and return structured results."""
    analyzer = SentimentIntensityAnalyzer()
    scores = analyzer.polarity_scores(text)
    compound = scores['compound']
    
    # Determine sentiment label with thresholds
    if compound >= 0.05:
        sentiment_label = "positive"
    elif compound <= -0.05:
        sentiment_label = "negative"
    else:
        sentiment_label = "neutral"
    
    is_negative_about_meepo = sentiment_label == "negative"
    
    return {
        'sentiment_score': compound,
        'sentiment_label': sentiment_label,
        'is_negative_about_meepo': is_negative_about_meepo
    }

def extract_posts(reddit, subreddit_name, keywords, cutoff_timestamp):
    """Extract Reddit posts mentioning Meepo keywords."""
    results = []
    subreddit = reddit.subreddit(subreddit_name)
    
    print(f"Searching posts in r/{subreddit_name}...")
    
    # Search using multiple keyword combinations
    search_queries = [
        "Meepo OR MeepoBoard OR \"Meepo Board\"",
        "meepo",
        "MeepoBoard"
    ]
    
    seen_ids = set()
    
    for query in search_queries:
        try:
            submissions = subreddit.search(query, time_filter="month", limit=50)
            
            for submission in submissions:
                if submission.id in seen_ids:
                    continue
                
                if submission.created_utc < cutoff_timestamp:
                    continue
                
                # Check if any Meepo keyword is mentioned
                title_text = submission.title.lower()
                content_text = (submission.selftext or "").lower()
                combined_text = f"{title_text} {content_text}"
                
                if any(keyword.lower() in combined_text for keyword in keywords):
                    seen_ids.add(submission.id)
                    
                    sentiment_data = analyze_sentiment(combined_text)
                    
                    result = {
                        'url': f"https://reddit.com{submission.permalink}",
                        'timestamp': datetime.fromtimestamp(submission.created_utc).isoformat(),
                        'content': submission.selftext or "",
                        'author': str(submission.author) if submission.author else "[deleted]",
                        'subreddit': subreddit_name,
                        'post_title': submission.title,
                        **sentiment_data
                    }
                    results.append(result)
                    
                    if sentiment_data['is_negative_about_meepo']:
                        print(f"Found negative post: {submission.title[:50]}...")
        
        except Exception as e:
            print(f"Error searching posts with query '{query}': {e}")
            continue
    
    return results

def extract_comments_via_pushshift(subreddit_name, keywords, pattern, cutoff_timestamp):
    """Extract comments using Pushshift API (fallback method)."""
    results = []
    
    print(f"Searching comments in r/{subreddit_name} via Pushshift...")
    
    # Pushshift is no longer available, so we'll skip comment extraction
    # or implement an alternative method
    print("Note: Pushshift API is no longer available. Skipping comment extraction.")
    return results

def extract_comments_from_posts(reddit, posts_data, pattern):
    """Extract comments from the posts we found."""
    results = []
    
    print("Extracting comments from found posts...")
    
    for post_data in posts_data:
        try:
            # Extract submission ID from URL
            submission_id = post_data['url'].split('/')[-3] if '/comments/' in post_data['url'] else None
            if not submission_id:
                continue
                
            submission = reddit.submission(id=submission_id)
            submission.comments.replace_more(limit=0)  # Remove "more comments" objects
            
            for comment in submission.comments.list():
                if comment.body and pattern.search(comment.body):
                    sentiment_data = analyze_sentiment(comment.body)
                    
                    result = {
                        'url': f"https://reddit.com{comment.permalink}",
                        'timestamp': datetime.fromtimestamp(comment.created_utc).isoformat(),
                        'content': comment.body,
                        'author': str(comment.author) if comment.author else "[deleted]",
                        'subreddit': post_data['subreddit'],
                        'post_title': post_data['post_title'],
                        **sentiment_data
                    }
                    results.append(result)
                    
                    if sentiment_data['is_negative_about_meepo']:
                        print(f"Found negative comment: {comment.body[:50]}...")
        
        except Exception as e:
            print(f"Error extracting comments from post {post_data.get('url', 'unknown')}: {e}")
            continue
    
    return results

def main():
    """Main function to execute Reddit sentiment tracking."""
    print("Starting Meepo Board Reddit Sentiment Tracker...")
    
    # Load credentials
    credentials = load_reddit_credentials()
    if not credentials or not all(credentials.values()):
        print("Error: Missing Reddit API credentials")
        return
    
    # Setup Reddit client
    reddit = setup_reddit_client(credentials)
    
    # Configuration
    target_subreddits = ["ElectricSkateboarding"]  # Start with just one subreddit for faster collection
    keywords, pattern = get_meepo_keywords()
    
    # Set cutoff to 3 months ago for faster initial collection
    cutoff_date = datetime.now() - timedelta(days=90)
    cutoff_timestamp = cutoff_date.timestamp()
    
    print(f"Searching for mentions since: {cutoff_date.strftime('%Y-%m-%d')}")
    print(f"Target subreddits: {target_subreddits}")
    print(f"Keywords: {keywords[:5]}...")  # Show first 5 keywords
    
    all_results = []
    
    # Extract posts from each subreddit
    for subreddit_name in target_subreddits:
        try:
            posts = extract_posts(reddit, subreddit_name, keywords, cutoff_timestamp)
            all_results.extend(posts)
            print(f"Found {len(posts)} posts in r/{subreddit_name}")
            
            # Skip comment extraction for faster initial collection
            # comments = extract_comments_from_posts(reddit, posts, pattern)
            # all_results.extend(comments)
            # print(f"Found {len(comments)} comments in r/{subreddit_name}")
            print(f"Skipping comment extraction for faster initial collection")
            
            # Add small delay to be respectful to Reddit's API
            time.sleep(1)
            
        except Exception as e:
            print(f"Error processing subreddit r/{subreddit_name}: {e}")
            continue
    
    # Filter and prioritize negative mentions
    negative_results = [r for r in all_results if r['is_negative_about_meepo']]
    
    # Sort by timestamp (newest first)
    all_results.sort(key=lambda x: x['timestamp'], reverse=True)
    
    # Save results to JSON
    # Use relative path within project
    import os
    project_root = os.path.dirname(os.path.dirname(__file__))
    output_file = os.path.join(project_root, 'data', 'meepo_reddit_sentiment_data.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    # Print summary
    total_mentions = len(all_results)
    negative_mentions = len(negative_results)
    positive_mentions = len([r for r in all_results if r['sentiment_label'] == 'positive'])
    neutral_mentions = len([r for r in all_results if r['sentiment_label'] == 'neutral'])
    
    print(f"\n=== MEEPO BOARD REDDIT SENTIMENT ANALYSIS COMPLETE ===")
    print(f"Total mentions found: {total_mentions}")
    print(f"Negative mentions: {negative_mentions} ({negative_mentions/total_mentions*100:.1f}% of total)" if total_mentions > 0 else "No mentions found")
    print(f"Positive mentions: {positive_mentions}")
    print(f"Neutral mentions: {neutral_mentions}")
    print(f"Results saved to: {output_file}")
    
    if negative_mentions > 0:
        print(f"\nTop 3 negative mentions:")
        for i, result in enumerate(negative_results[:3], 1):
            print(f"{i}. r/{result['subreddit']} - Score: {result['sentiment_score']:.3f}")
            print(f"   {result['content'][:100]}...")
            print(f"   URL: {result['url']}\n")

if __name__ == "__main__":
    main()
