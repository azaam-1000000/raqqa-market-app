

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Post, Comment, Like, Profile } from '../types';
import Spinner from '../components/ui/Spinner';
import PostCard from '../components/PostCard';
import CommentCard from '../components/CommentCard';
import CreateCommentForm from '../components/CreateCommentForm';
import { getErrorMessage } from '../utils/errors';
import PostCardSkeleton from '../components/ui/PostCardSkeleton';
import CommentCardSkeleton from '../components/ui/CommentCardSkeleton';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);

const PostDetailScreen: React.FC = () => {
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInitialData = useCallback(async () => {
        if (!postId) return;
        setLoading(true);
        setError(null);
        try {
            // Step 1: Fetch base post
            const { data: postData, error: postError } = await supabase
                .from('posts')
                .select('id, content, image_url, video_url, created_at, user_id, group_id')
                .eq('id', postId)
                .single();
            if (postError) throw postError;

            // Step 2: Fetch related post data + comments in parallel
            const [
                profileResult,
                likesResult,
                commentsResult
            ] = await Promise.all([
                supabase.from('profiles').select('full_name, avatar_url').eq('id', postData.user_id).single(),
                supabase.from('likes').select('user_id').eq('post_id', postId),
                supabase.from('comments').select('id, content, created_at, user_id, post_id').eq('post_id', postId).order('created_at', { ascending: true })
            ]);

            const { data: profileData, error: profileError } = profileResult;
            if (profileError) console.warn('Could not fetch post author profile', profileError.message);
            if (likesResult.error) throw likesResult.error;
            if (commentsResult.error) throw commentsResult.error;
            
            // Step 3: Augment post data
            setPost({
                ...postData,
                profiles: profileData || null,
                likes: likesResult.data || [],
                comments: [{ count: commentsResult.data?.length || 0 }]
            } as Post);

            // Step 4: Augment comments data
            const commentsData = commentsResult.data;
            if (commentsData && commentsData.length > 0) {
                const commentUserIds = [...new Set(commentsData.map(c => c.user_id))];
                const { data: commentProfiles, error: commentProfilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', commentUserIds);
                if (commentProfilesError) throw commentProfilesError;

                const profilesMap = new Map((commentProfiles || []).map(p => [p.id, p]));
                const augmentedComments = commentsData.map(comment => ({
                    ...comment,
                    profiles: profilesMap.get(comment.user_id) || null
                }));
                setComments(augmentedComments as any[]);
            } else {
                setComments([]);
            }
        } catch (err: unknown) {
            console.error(err);
            const message = getErrorMessage(err);
            if (message.includes('PGRST116')) setError('لم يتم العثور على المنشور.');
            else setError(message);
        } finally {
            setLoading(false);
        }
    }, [postId]);


    useEffect(() => {
        if(!postId) return;

        fetchInitialData();
        
        const channel = supabase.channel(`post-details-${postId}`);
        
        const subscriptions = channel
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, () => fetchInitialData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `post_id=eq.${postId}`}, () => fetchInitialData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `id=eq.${postId}` }, (payload) => {
                if (payload.eventType === 'DELETE') {
                    navigate('/home', { replace: true });
                } else {
                    fetchInitialData();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [postId, fetchInitialData, navigate]);

    const handlePostDeleted = useCallback(() => {
        navigate('/home', { replace: true });
    }, [navigate]);

    const handlePostUpdated = (updatedPost: Post) => {
        setPost(currentPost => currentPost ? {...currentPost, ...updatedPost} : updatedPost);
    };

    const handleCommentCreated = (newComment: Comment) => {
        setComments(current => [...current, newComment]);
    };

    const handleCommentDeleted = (commentId: string) => {
        setComments(current => current.filter(c => c.id !== commentId));
    };

    const handleCommentUpdated = (updatedComment: Comment) => {
        setComments(current => current.map(c => c.id === updatedComment.id ? { ...c, content: updatedComment.content } : c));
    };

    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-700">
                        <BackIcon />
                    </button>
                    <h1 className="text-xl font-bold">المنشور</h1>
                    <div className="w-10"></div> {/* Spacer */}
                </div>
            </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            {loading && (
              <div>
                <PostCardSkeleton />
                <div className="mt-6">
                  <div className="h-5 bg-slate-700 rounded w-1/4 mb-4 animate-pulse"></div>
                  <div className="space-y-4 mt-4">
                    <CommentCardSkeleton />
                    <CommentCardSkeleton />
                  </div>
                </div>
              </div>
            )}
            {error && <p className="text-center text-red-400 py-10">{error}</p>}
            {!loading && post && (
              <>
                <PostCard 
                    post={post} 
                    onPostDeleted={handlePostDeleted}
                    onPostUpdated={handlePostUpdated}
                />
                <div className="mt-6">
                    <h2 className="text-lg font-bold mb-4">التعليقات</h2>
                    <CreateCommentForm 
                        postId={post.id} 
                        postOwnerId={post.user_id}
                        onCommentCreated={handleCommentCreated}
                    />
                    <div className="space-y-4 mt-4">
                        {comments.length > 0 ? (
                            comments.map(comment => (
                                <CommentCard 
                                    key={comment.id} 
                                    comment={comment} 
                                    onCommentUpdated={handleCommentUpdated} 
                                    onCommentDeleted={handleCommentDeleted}
                                />
                            ))
                        ) : (
                            !loading && <p className="text-slate-400 text-center py-4">لا توجد تعليقات. كن أول من يعلق!</p>
                        )}
                    </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    );
};

export default PostDetailScreen;