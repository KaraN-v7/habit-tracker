'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface SubjectMapping {
    id: string;
    canonical_name: string;
    color: string;
    class_level: string;
}

export interface SubjectVariation {
    id: string;
    subject_id: string;
    variation: string;
}

interface SubjectRecognitionResult {
    canonical_name: string | null;
    color: string | null;
    matched_variation: string | null;
}

export function useSubjectRecognition() {
    const [subjects, setSubjects] = useState<SubjectMapping[]>([]);
    const [variations, setVariations] = useState<SubjectVariation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSubjectData();
    }, []);

    const loadSubjectData = async () => {
        try {
            // Load all subject mappings
            const { data: subjectData, error: subjectError } = await supabase
                .from('subject_mappings')
                .select('*');

            // If table doesn't exist, use fallback
            if (subjectError) {
                if (subjectError.code === '42P01') {
                    console.info('📚 Subject recognition tables not set up yet. Run subject-recognition-setup.sql in Supabase to enable subject recognition.');
                    setSubjects([]);
                    setVariations([]);
                    return;
                }
                throw subjectError;
            }

            // Load all variations
            const { data: variationData, error: variationError } = await supabase
                .from('subject_variations')
                .select('*');

            if (variationError) {
                if (variationError.code === '42P01') {
                    console.info('📚 Subject recognition tables not set up yet. Run subject-recognition-setup.sql in Supabase to enable subject recognition.');
                    setSubjects([]);
                    setVariations([]);
                    return;
                }
                throw variationError;
            }

            setSubjects(subjectData || []);
            setVariations(variationData || []);

            if (subjectData && subjectData.length > 0) {
                console.info(`✅ Loaded ${subjectData.length} subjects with ${variationData?.length || 0} variations`);
            }
        } catch (error) {
            console.error('Error loading subject data:', error);
            // Set empty arrays as fallback
            setSubjects([]);
            setVariations([]);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Recognizes a subject from text using the database variations
     * Returns the canonical name, color, and matched variation
     */
    const recognizeSubject = (text: string): SubjectRecognitionResult => {
        if (!text) return { canonical_name: null, color: null, matched_variation: null };

        const lowerText = text.toLowerCase();

        // First check for subjects in parentheses (from Syllabus push)
        const parenMatch = text.match(/\(([^)]+)\)$/);
        if (parenMatch) {
            const parenSubject = parenMatch[1];
            // Try to match this against variations
            const result = findSubjectMatch(parenSubject);
            if (result) return result;
        }

        // Otherwise, search through the entire text
        return findSubjectMatch(lowerText);
    };

    /**
     * Helper function to find the best matching subject
     * Prefers longer matches (e.g., "computer science" over "computer")
     */
    const findSubjectMatch = (text: string): SubjectRecognitionResult => {
        const lowerText = text.toLowerCase();

        // Sort variations by length (descending) to prefer longer matches
        const sortedVariations = [...variations].sort((a, b) =>
            b.variation.length - a.variation.length
        );

        for (const variation of sortedVariations) {
            if (lowerText.includes(variation.variation.toLowerCase())) {
                const subject = subjects.find(s => s.id === variation.subject_id);
                if (subject) {
                    return {
                        canonical_name: subject.canonical_name,
                        color: subject.color,
                        matched_variation: variation.variation
                    };
                }
            }
        }

        return { canonical_name: null, color: null, matched_variation: null };
    };

    /**
     * Get all subjects for a specific class level (e.g., "Class 10 CBSE")
     */
    const getSubjectsByClassLevel = (classLevel: string): SubjectMapping[] => {
        return subjects.filter(s => s.class_level === classLevel);
    };

    /**
     * Get all variations for a specific canonical subject name
     */
    const getVariationsForSubject = (canonicalName: string): string[] => {
        const subject = subjects.find(s => s.canonical_name === canonicalName);
        if (!subject) return [];

        return variations
            .filter(v => v.subject_id === subject.id)
            .map(v => v.variation);
    };

    /**
     * Add a new subject variation (for user customization)
     */
    const addVariation = async (canonicalName: string, newVariation: string): Promise<boolean> => {
        const subject = subjects.find(s => s.canonical_name === canonicalName);
        if (!subject) return false;

        try {
            const { error } = await supabase
                .from('subject_variations')
                .insert({
                    subject_id: subject.id,
                    variation: newVariation.toLowerCase()
                });

            if (error) throw error;

            // Reload data
            await loadSubjectData();
            return true;
        } catch (error) {
            console.error('Error adding variation:', error);
            return false;
        }
    };

    return {
        subjects,
        variations,
        loading,
        recognizeSubject,
        getSubjectsByClassLevel,
        getVariationsForSubject,
        addVariation,
    };
}
