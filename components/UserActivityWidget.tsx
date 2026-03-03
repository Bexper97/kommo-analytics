
import { Clock, User } from 'lucide-react';

interface UserActivity {
    userId: number;
    name: string;
    hours: number;
    firstAction: string;
    lastAction: string;
    actionCount: number;
}

export default function UserActivityWidget({ activity }: { activity: UserActivity[] }) {
    if (!activity || activity.length === 0) return null;

    return (
        <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-700 flex items-center gap-2">
                <Clock className="text-purple-500" />
                Team Activity (Est.)
            </h2>
            <div className="space-y-4">
                {activity.map((user) => (
                    <div key={user.userId} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                                <User size={16} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                                <p className="text-xs text-gray-400">
                                    {new Date(user.firstAction).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(user.lastAction).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-800">{user.hours}h</p>
                            <p className="text-xs text-gray-400">{user.actionCount} actions</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-2 text-xs text-gray-400 italic">
                *Hours estimated based on first and last action in the selected period.
            </div>
        </div>
    );
}
