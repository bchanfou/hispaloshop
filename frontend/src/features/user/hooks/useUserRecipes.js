import { useUserRecipesQuery } from '../queries';

export function useUserRecipes(userId, enabled) {
  const recipesQuery = useUserRecipesQuery(userId, { enabled });

  return {
    recipes: recipesQuery.data ?? [],
    isLoading: recipesQuery.isLoading,
    isFetching: recipesQuery.isFetching,
    refetch: recipesQuery.refetch,
  };
}

export default useUserRecipes;
