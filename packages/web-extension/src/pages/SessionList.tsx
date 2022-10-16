import { useEffect, useState } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from '@chakra-ui/react';
import { LocalData, LocalDataKey, Session } from '../types';
import Browser from 'webextension-polyfill';
import { useNavigate } from 'react-router-dom';

export function SessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const getSessions = (sessions?: LocalData['sessions']) => {
      if (!sessions) return;
      const sessionArray = [];
      for (const id in sessions) sessionArray.push(sessions[id]);
      setSessions(sessionArray);
    };
    void Browser.storage.local
      .get(LocalDataKey.sessions)
      .then((data) => getSessions((data as LocalData).sessions));
    Browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.sessions)
        getSessions(changes.sessions.newValue as LocalData['sessions']);
    });
  }, []);

  return (
    <TableContainer fontSize="md">
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Created Time</Th>
            <Th>RRWEB Version</Th>
          </Tr>
        </Thead>
        <Tbody>
          {sessions.map((session) => {
            return (
              <Tr
                onClick={() => {
                  navigate(`/session/${session.id}`);
                }}
                _hover={{ cursor: 'pointer' }}
              >
                <Td>{session.name}</Td>
                <Td>{new Date(session.createTimestamp).toLocaleString()}</Td>
                <Td>{session.recorderVersion}</Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
