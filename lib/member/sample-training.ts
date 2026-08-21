import type { TrainingSummary } from '@/lib/member/portal-data'

/**
 * Sample week shown behind the "Preview a sample week" control on the Training
 * screen. It is mock data and is always labelled as such in the UI, so a member
 * without a generated plan can still see what one looks like before committing
 * to the questionnaire.
 */
export const SAMPLE_TRAINING: TrainingSummary = {
    hasPlan: true,
    hasProfile: false,
    summary:
        'A four-day upper/lower split built around free weights, with two rest days and one optional conditioning day.',
    today: null,
    nutrition: {
        hasPlan: true,
        calories: 2450,
        protein: 165,
        carbs: 268,
        fat: 74,
    },
    sessions: [
        {
            day: 'Monday',
            focus: 'Upper body, push',
            exercises: [
                { name: 'Barbell bench press', sets: 4, reps: '6-8', restSeconds: 150 },
                { name: 'Seated dumbbell shoulder press', sets: 3, reps: '8-10', restSeconds: 105 },
                { name: 'Incline dumbbell press', sets: 3, reps: '10-12', restSeconds: 90 },
                {
                    name: 'Cable lateral raise',
                    sets: 3,
                    reps: '12-15',
                    restSeconds: 60,
                    notes: 'Lead with the elbow, stop at shoulder height.',
                },
                { name: 'Overhead rope triceps extension', sets: 3, reps: '12-15', restSeconds: 60 },
            ],
        },
        {
            day: 'Tuesday',
            focus: 'Lower body, quad focus',
            exercises: [
                { name: 'Back squat', sets: 4, reps: '5-6', restSeconds: 180 },
                { name: 'Romanian deadlift', sets: 3, reps: '8-10', restSeconds: 150 },
                { name: 'Walking lunge', sets: 3, reps: '10 per leg', restSeconds: 90 },
                { name: 'Leg extension', sets: 3, reps: '12-15', restSeconds: 60 },
                { name: 'Standing calf raise', sets: 4, reps: '12-15', restSeconds: 45 },
            ],
        },
        {
            day: 'Thursday',
            focus: 'Upper body, pull',
            exercises: [
                { name: 'Weighted pull-up', sets: 4, reps: '5-8', restSeconds: 150 },
                { name: 'Chest-supported row', sets: 3, reps: '8-10', restSeconds: 105 },
                { name: 'Single-arm lat pulldown', sets: 3, reps: '10-12', restSeconds: 90 },
                { name: 'Face pull', sets: 3, reps: '15-20', restSeconds: 60 },
                {
                    name: 'Incline dumbbell curl',
                    sets: 3,
                    reps: '10-12',
                    restSeconds: 60,
                    notes: 'Keep the upper arm behind the torso the whole set.',
                },
            ],
        },
        {
            day: 'Friday',
            focus: 'Lower body, hinge focus',
            exercises: [
                { name: 'Trap bar deadlift', sets: 4, reps: '4-6', restSeconds: 180 },
                { name: 'Bulgarian split squat', sets: 3, reps: '8 per leg', restSeconds: 120 },
                { name: 'Hip thrust', sets: 3, reps: '10-12', restSeconds: 105 },
                { name: 'Seated leg curl', sets: 3, reps: '12-15', restSeconds: 60 },
                { name: 'Hanging knee raise', sets: 3, reps: '12-15', restSeconds: 60 },
            ],
        },
    ],
}
