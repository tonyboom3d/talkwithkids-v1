import { useCallback, useMemo, useState } from "react";
import { buildCreatorOptions, filterOrdersByCreators } from "@/utils/orderCreatorFilter";

/**
 * מצב וסינון עובדים משותף ל-Dashboard, MySales ו-Statistics.
 * סימון "כל העובדים" מנקה את כל הסימונים הבודדים; סימון עובד/ת מבטל את "כל העובדים";
 * ביטול הסימון של העובד/ת האחרון/ה מחזיר את "כל העובדים".
 */
export function useCreatorFilter(orders, canViewOthers, user) {
  const [includeAllCreators, setIncludeAllCreators] = useState(true);
  const [selectedCreatorKeys, setSelectedCreatorKeys] = useState(() => new Set());

  const creatorOptions = useMemo(
    () => (canViewOthers ? buildCreatorOptions(orders) : []),
    [canViewOthers, orders]
  );

  const onIncludeAllChange = useCallback((checked) => {
    setIncludeAllCreators(checked);
    setSelectedCreatorKeys(new Set());
  }, []);

  const onToggleCreator = useCallback((creatorId, checked) => {
    setSelectedCreatorKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(creatorId);
      else next.delete(creatorId);
      setIncludeAllCreators(next.size === 0);
      return next;
    });
  }, []);

  const filterOrders = useCallback(
    (list) => filterOrdersByCreators(list, canViewOthers, includeAllCreators, selectedCreatorKeys, user),
    [canViewOthers, includeAllCreators, selectedCreatorKeys, user]
  );

  return {
    creatorOptions,
    includeAllCreators,
    selectedCreatorKeys,
    onIncludeAllChange,
    onToggleCreator,
    filterOrders,
  };
}
