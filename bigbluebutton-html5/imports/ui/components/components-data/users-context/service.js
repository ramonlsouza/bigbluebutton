import { useState, useContext, useEffect } from 'react';
import { UsersContext } from '/imports/ui/components/components-data/users-context/context';

const USER_JOIN_UPDATE_TIMEOUT = 1000;
const timeouts = [];

export default function useContextUsers(component) {
  const usingUsersContext = useContext(UsersContext);
  const { users: contextUsers } = usingUsersContext;

  const [users, setUsers] = useState(null);
  const [isReady, setIsReady] = useState(true);

  useEffect(() => {
    setIsReady(false);

    if (timeouts[component]) {
      clearTimeout(timeouts[component]);
    }

    timeouts[component] = setTimeout(() => {
      setUsers(contextUsers);
      setIsReady(true);
    }, USER_JOIN_UPDATE_TIMEOUT);
  }, [contextUsers]);

  return {
    users,
    isReady,
  };
}
