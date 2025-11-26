'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './page.module.css';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Camera, LogOut, User as UserIcon } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';

export default function ProfilePage() {
    const { user, signOut } = useAuth();
    const [fullName, setFullName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cropping state
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropping, setIsCropping] = useState(false);

    useEffect(() => {
        if (user) {
            setFullName(user.user_metadata?.custom_full_name || user.user_metadata?.full_name || '');
            setAvatarUrl(user.user_metadata?.custom_avatar_url || user.user_metadata?.avatar_url || null);
        }
    }, [user]);

    const handleUpdateProfile = async () => {
        setLoading(true);
        setMessage(null);

        try {
            console.log('Updating profile for user:', user?.id);
            console.log('New display name:', fullName);

            // 1. Update auth.users metadata
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: fullName,
                    custom_full_name: fullName
                }
            });

            if (error) {
                console.error('Auth update error:', error);
                throw error;
            }
            console.log('✅ Auth metadata updated');

            // 2. Update profiles table for leaderboard
            if (user) {
                console.log('Updating profiles table...');
                const { data, error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        display_name: fullName,
                        avatar_url: avatarUrl,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'id'
                    })
                    .select();

                if (profileError) {
                    console.error('❌ Profile table update error:', profileError);
                    setMessage({ type: 'error', text: `Profile updated in auth, but failed to update leaderboard: ${profileError.message}` });
                    return;
                }
                console.log('✅ Profile table updated:', data);
            }

            setMessage({ type: 'success', text: 'Profile and leaderboard updated successfully!' });
        } catch (error: any) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: `Failed to update profile: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result as string);
                setIsCropping(true);
            });
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSaveCroppedImage = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        setLoading(true);
        setMessage(null);

        try {
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (!croppedImageBlob) throw new Error('Failed to crop image');

            const fileName = `${user?.id}-${Math.random()}.jpg`;
            const filePath = `${fileName}`;

            // 1. Upload image to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, croppedImageBlob);

            if (uploadError) throw uploadError;

            // 2. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update user metadata with new avatar URL
            const { error: updateError } = await supabase.auth.updateUser({
                data: {
                    avatar_url: publicUrl,
                    custom_avatar_url: publicUrl
                }
            });

            if (updateError) throw updateError;

            // 4. Update profiles table for leaderboard
            if (user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        display_name: fullName,
                        avatar_url: publicUrl,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'id'
                    });

                if (profileError) {
                    console.error('Error updating profile table:', profileError);
                    // Don't throw - avatar update succeeded
                }
            }

            setAvatarUrl(publicUrl);
            setMessage({ type: 'success', text: 'Avatar updated successfully!' });
            setIsCropping(false);
            setImageSrc(null);
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            if (error.message?.includes('bucket not found') || error.statusCode === '404') {
                setMessage({ type: 'error', text: 'Storage bucket "avatars" not found. Please create it in Supabase dashboard.' });
            } else {
                setMessage({ type: 'error', text: 'Failed to upload avatar.' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancelCrop = () => {
        setIsCropping(false);
        setImageSrc(null);
        // Reset file input so the same file can be selected again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Profile Settings</h1>
                <p className={styles.subtitle}>Manage your account settings and preferences</p>
            </div>

            <div className={styles.card}>
                <div className={styles.avatarSection}>
                    <div className={styles.avatarWrapper}>
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Profile" className={styles.avatar} />
                        ) : (
                            <div className={styles.avatarPlaceholder}>
                                {fullName ? fullName.charAt(0).toUpperCase() : <UserIcon size={40} />}
                            </div>
                        )}
                    </div>

                    <div>
                        <button
                            className={styles.uploadButton}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                        >
                            <Camera size={16} />
                            Change Picture
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={onFileChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            Recommended: Square JPG, PNG. Max 1MB.
                        </p>
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Display Name</label>
                    <input
                        type="text"
                        className={styles.input}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your name"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Email</label>
                    <input
                        type="text"
                        className={styles.input}
                        value={user?.email || ''}
                        disabled
                        style={{ opacity: 0.7, cursor: 'not-allowed' }}
                    />
                </div>

                {message && (
                    <div style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: message.type === 'success' ? '#10b981' : '#ef4444',
                        fontSize: '0.9rem'
                    }}>
                        {message.text}
                    </div>
                )}

                <button
                    className={styles.saveButton}
                    onClick={handleUpdateProfile}
                    disabled={loading}
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>

                <hr style={{ borderColor: 'var(--border-color)', margin: '1rem 0' }} />

                <button className={styles.signOutButton} onClick={signOut}>
                    <LogOut size={16} style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'text-bottom' }} />
                    Sign Out
                </button>
            </div>

            {/* Cropping Modal */}
            {isCropping && imageSrc && (
                <div className={styles.cropperModal}>
                    <div className={styles.cropperContainer}>
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    </div>
                    <div className={styles.cropperControls}>
                        <div className={styles.sliderContainer}>
                            <span className={styles.sliderLabel}>Zoom</span>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className={styles.slider}
                            />
                        </div>
                        <div className={styles.buttonGroup}>
                            <button className={styles.cancelButton} onClick={handleCancelCrop}>
                                Cancel
                            </button>
                            <button className={styles.modalSaveButton} onClick={handleSaveCroppedImage} disabled={loading}>
                                {loading ? 'Saving...' : 'Save & Apply'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
